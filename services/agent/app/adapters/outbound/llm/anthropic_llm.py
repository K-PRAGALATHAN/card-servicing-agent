"""Claude language model adapter (implements the LanguageModel port).

Used when ANTHROPIC_API_KEY is set. It only *converses* — classifies intent and
extracts slots. The deterministic PolicyEngine still makes every decision, so a
hallucinated action can at worst be denied/escalated, never executed without an
ALLOW decision and explicit confirmation.

Structured outputs (``output_config.format``) pin the response to a JSON schema,
so a malformed reply can't be mistaken for an ambiguous customer. On any error
it degrades to UNCERTAIN (which the pipeline escalates) and *logs the cause* —
a dead LLM must not look like a confused customer.
"""

from __future__ import annotations

import json
import logging

from app.domain.conversation.intent import ClassifiedIntent, IntentKind
from app.domain.conversation.message import Message, Role
from app.domain.conversation.servicing import REQUIRED_SLOTS, ServicingType

logger = logging.getLogger(__name__)

_ACTIONS = [a.value for a in ServicingType]

# JSON type for every slot the policy engine can consume. Amounts are integer
# paise so the engine never sees a float.
_SLOT_TYPES: dict[str, str] = {
    "card_id": "string",
    "fee_amount_minor": "integer",
    "requested_limit_minor": "integer",
    "new_day_of_month": "integer",
    "source_account_id": "string",
    "transaction_ref": "string",
    "reason": "string",
    "field": "string",
    "value": "string",
}

# How many prior turns to send as classification context.
_HISTORY_TURNS = 6


# Substrings that mark a 400 as "this model/SDK won't take my schema", as
# opposed to a billing, size, or auth problem that a retry can't fix.
_SCHEMA_REJECTION_MARKERS = ("output_config", "output_format", "json_schema", "schema")


def _is_schema_rejection(exc: Exception) -> bool:
    if isinstance(exc, TypeError):  # SDK too old to accept output_config
        return True
    message = str(getattr(exc, "message", "") or exc).lower()
    return any(marker in message for marker in _SCHEMA_REJECTION_MARKERS)


def _nullable(json_type: str) -> dict[str, object]:
    """A slot the model may legitimately be unable to extract."""
    return {"anyOf": [{"type": json_type}, {"type": "null"}]}


def _slots_schema(names: tuple[str, ...]) -> dict[str, object]:
    return {
        "type": "object",
        "properties": {name: _nullable(_SLOT_TYPES[name]) for name in names},
        "required": list(names),
        "additionalProperties": False,
    }


_CLASSIFY_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "kind": {"type": "string", "enum": ["action", "policy_query", "uncertain"]},
        "action": {"anyOf": [{"type": "string", "enum": _ACTIONS}, {"type": "null"}]},
        "confidence": {"type": "number"},
        "slots": _slots_schema(tuple(_SLOT_TYPES)),
    },
    "required": ["kind", "action", "confidence", "slots"],
    "additionalProperties": False,
}

_CLASSIFY_SYSTEM = (
    "You are the intent classifier for a bank card-servicing assistant. "
    "You NEVER decide, promise, or authorize anything — you only classify and extract.\n"
    "- kind: 'action' when the customer wants a servicing action performed, "
    "'policy_query' for an informational question, 'uncertain' when neither is clear.\n"
    "- action: the servicing type when kind='action'; otherwise null.\n"
    "- confidence: 0..1, how sure you are of kind and action.\n"
    "- slots: any field you can extract from the message; null for anything absent. "
    "Never guess a card_id or an amount that the customer did not state. "
    "Amounts are integer paise (₹1 = 100)."
)

_POLICY_SYSTEM = (
    "You are a helpful bank card-servicing assistant. Answer the customer's policy "
    "question concisely, in at most three sentences. Do not promise, decide, or "
    "authorize any action, and do not quote specific account data you were not given."
)

# Thinking is left on adaptive (the Claude Opus 5 default) at low effort:
# classification is cheap, and disabling thinking risks internal tags leaking
# into the response. max_tokens covers thinking + text.
_MAX_TOKENS = 4096
_EFFORT = "low"


class AnthropicLanguageModel:
    def __init__(self, api_key: str, model: str = "claude-opus-5") -> None:
        from anthropic import Anthropic

        self._client = Anthropic(api_key=api_key)
        self._model = model
        # Cleared for the process if the model/SDK rejects output_config.format,
        # so an unsupported schema degrades to prompted JSON rather than making
        # every turn escalate.
        self._structured = True

    def classify(self, text: str, history: list[Message]) -> ClassifiedIntent:
        try:
            data = json.loads(
                self._chat_json(
                    _CLASSIFY_SYSTEM,
                    self._history_messages(history) + [{"role": "user", "content": text}],
                    _CLASSIFY_SCHEMA,
                )
            )
        except Exception:  # noqa: BLE001 — degrade safely, but never silently
            logger.exception("Claude classify failed; escalating as uncertain")
            return ClassifiedIntent(IntentKind.UNCERTAIN, 0.0)

        kind = self._to_kind(data.get("kind"))
        action = self._to_action(data.get("action"))
        confidence = self._to_float(data.get("confidence"))
        slots = self._clean_slots(data.get("slots"))

        if kind is IntentKind.ACTION and action is None:
            return ClassifiedIntent(IntentKind.UNCERTAIN, 0.0)
        return ClassifiedIntent(kind, confidence, action, slots)

    def extract_slots(
        self, action: ServicingType, text: str, known: dict[str, object]
    ) -> dict[str, object]:
        required = REQUIRED_SLOTS[action]
        system = (
            f"Extract servicing slots for a '{action.value}' request. "
            f"The slots to fill are: {', '.join(required)}. "
            "Use null for anything the customer has not stated — never invent a value. "
            "Amounts are integer paise (₹1 = 100)."
        )
        user = f"Known slots: {json.dumps(known)}\nCustomer message: {text}"
        try:
            data = json.loads(
                self._chat_json(
                    system, [{"role": "user", "content": user}], _slots_schema(required)
                )
            )
        except Exception:  # noqa: BLE001 — degrade safely, but never silently
            logger.exception("Claude slot extraction failed for %s", action.value)
            return {}
        return self._clean_slots(data)

    def answer_policy_query(self, text: str) -> str:
        try:
            return self._chat_text(_POLICY_SYSTEM, text)
        except Exception:  # noqa: BLE001 — degrade safely, but never silently
            logger.exception("Claude policy answer failed")
            return "I'm sorry, I couldn't look that up right now."

    # ── Claude calls ───────────────────────────────────────────
    def _chat_json(
        self,
        system: str,
        messages: list[dict[str, object]],
        schema: dict[str, object],
    ) -> str:
        import anthropic

        if self._structured:
            try:
                return self._first_text(
                    self._client.messages.create(
                        model=self._model,
                        max_tokens=_MAX_TOKENS,
                        system=system,
                        messages=messages,
                        output_config={
                            "effort": _EFFORT,
                            "format": {"type": "json_schema", "schema": schema},
                        },
                    )
                )
            except (anthropic.BadRequestError, TypeError) as exc:
                # Only a *schema* rejection means structured outputs are
                # unsupported. Other 400s (billing, oversized request) must not
                # disable it — that would silently double every later call.
                if not _is_schema_rejection(exc):
                    raise
                logger.warning(
                    "Structured outputs rejected by %s; falling back to prompted JSON",
                    self._model,
                    exc_info=True,
                )
                self._structured = False

        # Fallback: ask for the same shape in the prompt and parse it ourselves.
        return self._first_text(
            self._client.messages.create(
                model=self._model,
                max_tokens=_MAX_TOKENS,
                system=(
                    f"{system}\n\nReply with STRICT JSON only — no prose, no code fences — "
                    f"matching this JSON schema:\n{json.dumps(schema)}"
                ),
                messages=messages,
                output_config={"effort": _EFFORT},
            )
        )

    def _chat_text(self, system: str, user: str) -> str:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=_MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={"effort": _EFFORT},
        )
        return self._first_text(response)

    @staticmethod
    def _first_text(response: object) -> str:
        """Text of the first text block. Raises on a refusal or empty response."""
        stop_reason = getattr(response, "stop_reason", None)
        if stop_reason == "refusal":
            raise RuntimeError(f"Claude refused the request: {getattr(response, 'stop_details', None)}")
        for block in getattr(response, "content", []):
            if getattr(block, "type", None) == "text":
                return block.text
        raise RuntimeError(f"Claude returned no text block (stop_reason={stop_reason})")

    # ── parsing helpers ────────────────────────────────────────
    @staticmethod
    def _history_messages(history: list[Message]) -> list[dict[str, object]]:
        """Recent turns as Claude messages, alternating from a customer turn."""
        recent = [m for m in history if m.role in (Role.CUSTOMER, Role.AGENT)][-_HISTORY_TURNS:]
        while recent and recent[0].role is not Role.CUSTOMER:
            recent.pop(0)
        return [
            {"role": "user" if m.role is Role.CUSTOMER else "assistant", "content": m.text}
            for m in recent
        ]

    @staticmethod
    def _clean_slots(raw: object) -> dict[str, object]:
        """Drop the nulls the schema forces the model to emit."""
        if not isinstance(raw, dict):
            return {}
        return {k: v for k, v in raw.items() if v is not None and v != ""}

    @staticmethod
    def _to_kind(value: object) -> IntentKind:
        try:
            return IntentKind(value)
        except ValueError:
            return IntentKind.UNCERTAIN

    @staticmethod
    def _to_action(value: object) -> ServicingType | None:
        if not value:
            return None
        try:
            return ServicingType(value)
        except ValueError:
            return None

    @staticmethod
    def _to_float(value: object) -> float:
        try:
            return float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0.0
