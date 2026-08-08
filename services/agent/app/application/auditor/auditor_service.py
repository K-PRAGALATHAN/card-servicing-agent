"""Auditor service — the read/monitor surface for bank staff.

Aggregates the durable session transcripts and the hash-chained audit trail from
MongoDB into the views the console needs: a conversation inbox, a per-conversation
transcript + decision trail with tamper verification, lightweight case metadata
(assignee / priority / status), and summary stats.
"""

from __future__ import annotations

from typing import Any

from app.domain.conversation.audit import verify_chain


def _last_message(messages: list[dict]) -> dict | None:
    return messages[-1] if messages else None


class AuditorService:
    def __init__(self, mongo_url: str, db_name: str) -> None:
        from pymongo import MongoClient

        db = MongoClient(mongo_url)[db_name]
        self._sessions = db["sessions"]
        self._audit = db["audit"]
        self._meta = db["auditor_meta"]  # {_id: conversation_id, assignee, priority, status}

    # ── inbox ──────────────────────────────────────────────────
    def list_conversations(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for doc in self._sessions.find():
            cid = doc["_id"]
            messages = doc.get("messages") or []
            audits = list(self._audit.find({"conversation_id": cid}, sort=[("seq", 1)]))
            meta = self._meta.find_one({"_id": cid}) or {}
            last = _last_message(messages)
            decisions = [a["decision"] for a in audits]
            out.append(
                {
                    "conversation_id": cid,
                    "customer_id": doc.get("customer_id"),
                    "message_count": len(messages),
                    "last_message": last["text"] if last else "",
                    "last_at": last["created_at"] if last else None,
                    "phase": doc.get("phase"),
                    "decisions": decisions,
                    "escalated": "escalate" in decisions,
                    "assignee": meta.get("assignee"),
                    "priority": meta.get("priority", "medium"),
                    "status": meta.get("status", "open"),
                }
            )
        out.sort(key=lambda c: c.get("last_at") or "", reverse=True)
        return out

    # ── one conversation ───────────────────────────────────────
    def get_conversation(self, conversation_id: str) -> dict[str, Any]:
        doc = self._sessions.find_one({"_id": conversation_id}) or {}
        audits = [
            {k: v for k, v in a.items() if k != "_id"}
            for a in self._audit.find({"conversation_id": conversation_id}, sort=[("seq", 1)])
        ]
        meta = self._meta.find_one({"_id": conversation_id}) or {}
        from app.domain.conversation.audit import AuditRecord

        records = [AuditRecord(**a) for a in audits]
        return {
            "conversation_id": conversation_id,
            "customer_id": doc.get("customer_id"),
            "phase": doc.get("phase"),
            "messages": doc.get("messages") or [],
            "audit": audits,
            "chain_ok": verify_chain(records) if records else True,
            "assignee": meta.get("assignee"),
            "priority": meta.get("priority", "medium"),
            "status": meta.get("status", "open"),
        }

    # ── case actions ───────────────────────────────────────────
    def _set_meta(self, conversation_id: str, field: str, value: Any) -> dict[str, Any]:
        self._meta.update_one({"_id": conversation_id}, {"$set": {field: value}}, upsert=True)
        meta = self._meta.find_one({"_id": conversation_id}) or {}
        return {"conversation_id": conversation_id, field: meta.get(field)}

    def assign(self, conversation_id: str, assignee: str | None) -> dict[str, Any]:
        return self._set_meta(conversation_id, "assignee", assignee)

    def set_priority(self, conversation_id: str, priority: str) -> dict[str, Any]:
        return self._set_meta(conversation_id, "priority", priority)

    def set_status(self, conversation_id: str, status: str) -> dict[str, Any]:
        return self._set_meta(conversation_id, "status", status)

    # ── stats ──────────────────────────────────────────────────
    def stats(self) -> dict[str, Any]:
        by_decision: dict[str, int] = {}
        by_action: dict[str, int] = {}
        records = []
        from app.domain.conversation.audit import AuditRecord

        for a in self._audit.find(sort=[("seq", 1)]):
            by_decision[a["decision"]] = by_decision.get(a["decision"], 0) + 1
            by_action[a["action"]] = by_action.get(a["action"], 0) + 1
            records.append(AuditRecord(**{k: v for k, v in a.items() if k != "_id"}))
        return {
            "conversations": self._sessions.count_documents({}),
            "audit_records": len(records),
            "by_decision": by_decision,
            "by_action": by_action,
            "chain_ok": verify_chain(records) if records else True,
        }
