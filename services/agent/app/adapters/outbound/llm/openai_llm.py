"""GPT-4 language model adapter (implements the LanguageModel port).

Used only when OPENAI_API_KEY is set. It only *converses* — classifies intent
and extracts slots. The deterministic PolicyEngine still makes every decision,
so a hallucinated action can at worst be denied/escalated, never executed
without an ALLOW decision and explicit confirmation. On any error it degrades to
UNCERTAIN (which the pipeline escalates), never to a silent wrong action.
"""

from __future__ import annotations

import json

from app.domain.conversation.intent import ClassifiedIntent, IntentKind
from app.domain.conversation.message import Message
from app.domain.conversation.servicing import REQUIRED_SLOTS, ServicingType

_ACTIONS = ", ".join(a.value for a in ServicingType)

_CLASSIFY_SYSTEM = (
    "You are the intent classifier for a bank card-servicing assistant. "
    "You NEVER decide, promise, or authorize anything — you only classify and extract. "
    "Return STRICT JSON with keys: kind, action, confidence, slots.\n"
    "- kind: one of 'action', 'policy_query', 'uncertain'.\n"
    f"- action: when kind='action', one of [{_ACTIONS}]; otherwise null.\n"
    "- confidence: a number 0..1.\n"
    "- slots: an object with any fields you can extract, e.g. card_id, "
    "fee_amount_minor (integer paise, ₹1=100), requested_limit_minor, "
    "new_day_of_month (integer), field, value, reason, transaction_ref."
)


class OpenAILanguageModel:
    def __init__(self, api_key: str, model: str = "gpt-4o") -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def classify(self, text: str, history: list[Message]) -> ClassifiedIntent:
        try:
            data = json.loads(self._chat_json(_CLASSIFY_SYSTEM, text))
        except Exception:  # noqa: BLE001 — degrade safely on any LLM/parse error
            return ClassifiedIntent(IntentKind.UNCERTAIN, 0.0)

        kind = self._to_kind(data.get("kind"))
        action = self._to_action(data.get("action"))
        confidence = self._to_float(data.get("confidence"))
        raw_slots = data.get("slots")
        slots = raw_slots if isinstance(raw_slots, dict) else {}

        if kind is IntentKind.ACTION and action is None:
            return ClassifiedIntent(IntentKind.UNCERTAIN, 0.0)
        return ClassifiedIntent(kind, confidence, action, slots)

    def extract_slots(
        self, action: ServicingType, text: str, known: dict[str, object]
    ) -> dict[str, object]:
        required = ", ".join(REQUIRED_SLOTS[action])
        system = (
            "Extract servicing slots as STRICT JSON (an object). "
            f"For action '{action.value}', the required slots are: {required}. "
            "Amounts are integer paise (₹1 = 100). Include only slots you can extract."
        )
        user = f"Known slots: {json.dumps(known)}\nCustomer message: {text}"
        try:
            data = json.loads(self._chat_json(system, user))
            return data if isinstance(data, dict) else {}
        except Exception:  # noqa: BLE001 — degrade safely on any LLM/parse error
            return {}

    def answer_policy_query(self, text: str) -> str:
        system = (
            "You are a helpful bank card-servicing assistant. Answer the policy "
            "question concisely. Do not promise, decide, or authorize any action."
        )
        try:
            return self._chat(system, text)
        except Exception:  # noqa: BLE001 — degrade safely on any LLM/parse error
            return "I'm sorry, I couldn't look that up right now."

    # ── OpenAI calls ───────────────────────────────────────────
    def _chat_json(self, system: str, user: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        return response.choices[0].message.content or "{}"

    def _chat(self, system: str, user: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or ""

    # ── parsing helpers ────────────────────────────────────────
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
