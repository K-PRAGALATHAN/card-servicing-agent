"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  auditorApi,
  AuthError,
  type ConversationDetail,
  type ConversationSummary,
  type Stats,
} from "@/lib/api";

type Tab = "mine" | "unassigned" | "all";

const KEY_STORE = "console.key";
const ME_STORE = "console.me";
const THEME_STORE = "console.theme";

function initials(id: string): string {
  return (
    id
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "??"
  );
}
function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function Console(): React.JSX.Element {
  const [key, setKey] = useState<string | null>(null);
  const [me, setMe] = useState("You");
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<Tab>("all");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem(KEY_STORE);
    setMe(localStorage.getItem(ME_STORE) || "You");
    const savedTheme = (localStorage.getItem(THEME_STORE) as "dark" | "light") || "dark";
    setTheme(savedTheme);
    if (savedKey) setKey(savedKey);
    setReady(true);
  }, []);

  const loadConversations = useCallback(async () => {
    if (!key) return;
    try {
      const [convs, s] = await Promise.all([auditorApi.conversations(key), auditorApi.stats(key)]);
      setConversations(convs);
      setStats(s);
      setAuthError(false);
    } catch (e) {
      if (e instanceof AuthError) {
        setAuthError(true);
        setKey(null);
        localStorage.removeItem(KEY_STORE);
      }
    }
  }, [key]);

  const loadDetail = useCallback(async () => {
    if (!key || !selectedId) return;
    try {
      setDetail(await auditorApi.conversation(key, selectedId));
    } catch {
      /* ignore transient */
    }
  }, [key, selectedId]);

  // Polling refresh (live-ish).
  useEffect(() => {
    if (!key) return;
    void loadConversations();
    const t = setInterval(() => {
      void loadConversations();
      void loadDetail();
    }, 5000);
    return () => clearInterval(t);
  }, [key, loadConversations, loadDetail]);

  useEffect(() => {
    void loadDetail();
  }, [selectedId, loadDetail]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [detail?.messages.length, selectedId]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORE, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function submitKey(e: React.FormEvent) {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem(KEY_STORE, k);
    setKey(k);
    setAuthError(false);
  }

  async function act(fn: () => Promise<unknown>) {
    await fn();
    await Promise.all([loadConversations(), loadDetail()]);
  }

  if (!ready) return <div className="gate" />;

  if (!key) {
    return (
      <div className="gate">
        <form className="gate-card" onSubmit={submitKey}>
          <h1>Auditor Console</h1>
          <p>Bank staff access — enter your auditor key.</p>
          {authError ? <p style={{ color: "var(--danger)" }}>Invalid key, try again.</p> : null}
          <input
            className="field"
            type="password"
            placeholder="Auditor key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            autoFocus
          />
          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 12 }}
            type="submit"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const filtered = conversations.filter((c) =>
    tab === "mine" ? c.assignee === me : tab === "unassigned" ? !c.assignee : true,
  );

  return (
    <div className="shell">
      {/* Left rail */}
      <div className="rail">
        <div className="rail-logo">CS</div>
        <button className="rail-btn active" title="Inbox">
          🗂️
        </button>
        <button className="rail-btn" title="Conversations">
          💬
        </button>
        <button className="rail-btn" title="Settings">
          ⚙️
        </button>
        <div className="rail-spacer" />
        <button className="rail-btn" title="Toggle theme" onClick={toggleTheme}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button
          className="rail-btn"
          title="Sign out"
          onClick={() => {
            localStorage.removeItem(KEY_STORE);
            setKey(null);
          }}
        >
          ⏻
        </button>
      </div>

      {/* Conversation list */}
      <div className="col">
        <div className="col-head">
          <h2>Conversations</h2>
          <div className="sub">AI agent ↔ customer · live audit</div>
        </div>
        {stats ? (
          <div className="statbar">
            <div className="stat">
              <div className="n">{stats.conversations}</div>
              <div className="l">Chats</div>
            </div>
            <div className="stat">
              <div className="n">{stats.audit_records}</div>
              <div className="l">Decisions</div>
            </div>
            <div className="stat">
              <div className="n" style={{ color: stats.chain_ok ? "var(--ok)" : "var(--danger)" }}>
                {stats.chain_ok ? "✓" : "✗"}
              </div>
              <div className="l">Chain</div>
            </div>
          </div>
        ) : null}
        <div className="tabs">
          {(["mine", "unassigned", "all"] as Tab[]).map((tb) => (
            <button
              key={tb}
              className={`tab ${tab === tb ? "active" : ""}`}
              onClick={() => setTab(tb)}
            >
              {tb === "mine" ? "Mine" : tb === "unassigned" ? "Unassigned" : "All"}
            </button>
          ))}
        </div>
        <div className="list">
          {filtered.length === 0 ? (
            <div style={{ color: "var(--muted)", padding: 20, textAlign: "center" }}>
              No conversations.
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.conversation_id}
                className={`conv ${selectedId === c.conversation_id ? "sel" : ""}`}
                onClick={() => setSelectedId(c.conversation_id)}
              >
                <div className="conv-top">
                  <span className="conv-cust">{c.customer_id}</span>
                  <span className="conv-time">{timeAgo(c.last_at)}</span>
                </div>
                <div className="conv-last">{c.last_message || "…"}</div>
                <div className="conv-meta">
                  <span className={`chip pri-${c.priority}`}>
                    <span className="chip-dot" style={{ background: "currentColor" }} />
                    {c.priority}
                  </span>
                  <span className={`chip st-${c.status}`}>{c.status}</span>
                  {c.escalated ? <span className="chip esc">escalated</span> : null}
                  {c.assignee ? <span className="chip ghost">@{c.assignee}</span> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center: transcript + decision trail */}
      <div className="center">
        {!detail ? (
          <div className="empty">
            Select a conversation to review its transcript and decision trail.
          </div>
        ) : (
          <>
            <div className="center-head">
              <div>
                <div className="center-title">{detail.customer_id}</div>
                <div className="center-sub">
                  {detail.conversation_id} · {detail.messages.length} messages
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    act(() =>
                      auditorApi.assign(
                        key,
                        detail.conversation_id,
                        detail.assignee === me ? null : me,
                      ),
                    )
                  }
                >
                  {detail.assignee === me ? "Unassign" : "Assign to me"}
                </button>
                <select
                  className="select"
                  value={detail.priority}
                  onChange={(e) =>
                    act(() => auditorApi.setPriority(key, detail.conversation_id, e.target.value))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button
                  className={`btn btn-sm ${detail.status === "open" ? "btn-primary" : ""}`}
                  onClick={() =>
                    act(() =>
                      auditorApi.setStatus(
                        key,
                        detail.conversation_id,
                        detail.status === "open" ? "resolved" : "open",
                      ),
                    )
                  }
                >
                  {detail.status === "open" ? "Resolve" : "Reopen"}
                </button>
              </div>
            </div>

            <div className="stream" ref={streamRef}>
              {detail.messages.map((m, i) => (
                <div key={i} className={`row ${m.role}`}>
                  <div className={`bubble ${m.role}`}>
                    <div className="who">{m.role === "customer" ? "Customer" : "AI Agent"}</div>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="trail">
              <div className="trail-head">
                <h3>Decision trail (policy engine)</h3>
                <span className={detail.chain_ok ? "verify-ok" : "verify-bad"}>
                  {detail.chain_ok ? "✓ Tamper-evident chain verified" : "✗ Chain broken"}
                </span>
              </div>
              <div className="audit">
                {detail.audit.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    No servicing decisions in this conversation.
                  </div>
                ) : (
                  detail.audit.map((a) => (
                    <div key={a.seq} className="audit-item">
                      <div className="audit-row">
                        <span className="chip ghost">#{a.seq}</span>
                        <span className="audit-action">{a.action.replace(/_/g, " ")}</span>
                        <span className={`chip ${a.decision}`}>{a.decision}</span>
                        {a.confirmed ? <span className="chip allow">confirmed</span> : null}
                        <span className="audit-rule">{a.rule}</span>
                      </div>
                      <div className="audit-hash">
                        hash {a.hash.slice(0, 24)}… · prev {a.prev_hash.slice(0, 12)}…
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contact panel */}
      <div className="contact">
        {detail ? (
          <>
            <div className="avatar">{initials(detail.customer_id)}</div>
            <h3>{detail.customer_id}</h3>
            <div className="id">Customer ID</div>
            <div className="divider" />
            <div className="kv">
              <div className="kv-label">Status</div>
              <div className="kv-val" style={{ textTransform: "capitalize" }}>
                {detail.status}
              </div>
            </div>
            <div className="kv">
              <div className="kv-label">Priority</div>
              <div className="kv-val" style={{ textTransform: "capitalize" }}>
                {detail.priority}
              </div>
            </div>
            <div className="kv">
              <div className="kv-label">Assignee</div>
              <div className="kv-val">{detail.assignee ? `@${detail.assignee}` : "Unassigned"}</div>
            </div>
            <div className="kv">
              <div className="kv-label">Phase</div>
              <div className="kv-val">{detail.phase ?? "idle"}</div>
            </div>
            <div className="divider" />
            <div className="kv">
              <div className="kv-label">Audit integrity</div>
              <div className={detail.chain_ok ? "verify-ok" : "verify-bad"}>
                {detail.chain_ok ? "Verified ✓" : "Broken ✗"}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: "var(--muted)" }}>Contact details appear here.</div>
        )}
      </div>
    </div>
  );
}
