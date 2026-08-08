const BASE = process.env.NEXT_PUBLIC_AGENT_BASE ?? "http://localhost:8000";

export interface ConversationSummary {
  conversation_id: string;
  customer_id: string;
  message_count: number;
  last_message: string;
  last_at: string | null;
  phase: string | null;
  decisions: string[];
  escalated: boolean;
  assignee: string | null;
  priority: "low" | "medium" | "high";
  status: "open" | "resolved";
}

export interface AuditRecord {
  seq: number;
  at: string;
  conversation_id: string;
  customer_id: string;
  action: string;
  decision: "allow" | "deny" | "escalate";
  rule: string;
  slots: Record<string, unknown>;
  confirmed: boolean;
  tool_result: Record<string, unknown> | null;
  prev_hash: string;
  hash: string;
}

export interface TranscriptMessage {
  role: "customer" | "agent" | "system";
  text: string;
  created_at: string;
}

export interface ConversationDetail {
  conversation_id: string;
  customer_id: string;
  phase: string | null;
  messages: TranscriptMessage[];
  audit: AuditRecord[];
  chain_ok: boolean;
  assignee: string | null;
  priority: "low" | "medium" | "high";
  status: "open" | "resolved";
}

export interface Stats {
  conversations: number;
  audit_records: number;
  by_decision: Record<string, number>;
  by_action: Record<string, number>;
  chain_ok: boolean;
}

export class AuthError extends Error {}

async function call<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-auditor-key": key, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 401) throw new AuthError("Invalid auditor key");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const auditorApi = {
  stats: (key: string) => call<Stats>("/auditor/stats", key),
  conversations: (key: string) =>
    call<{ conversations: ConversationSummary[] }>("/auditor/conversations", key).then(
      (d) => d.conversations,
    ),
  conversation: (key: string, id: string) =>
    call<ConversationDetail>(`/auditor/conversations/${id}`, key),
  assign: (key: string, id: string, assignee: string | null) =>
    call(`/auditor/conversations/${id}/assign`, key, {
      method: "POST",
      body: JSON.stringify({ assignee }),
    }),
  setPriority: (key: string, id: string, priority: string) =>
    call(`/auditor/conversations/${id}/priority`, key, {
      method: "POST",
      body: JSON.stringify({ priority }),
    }),
  setStatus: (key: string, id: string, status: string) =>
    call(`/auditor/conversations/${id}/status`, key, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
};
