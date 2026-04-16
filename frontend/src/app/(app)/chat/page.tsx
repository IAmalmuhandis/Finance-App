"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Plus, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { toast } from "sonner";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    const r = await fetch("/api/chat/conversations");
    const j = await r.json();
    setConversations(j.conversations || []);
  };
  const loadConversation = async (id: string) => {
    const r = await fetch(`/api/chat/conversations/${id}`);
    const j = await r.json();
    setMessages((j.conversation?.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
    setConversationId(id);
  };

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, conversationId, history: messages }),
    });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error || "Message failed"); setLoading(false); return; }
    setMessages((m) => [...m, { role: "assistant", content: j.response }]);
    setConversationId(j.conversationId);
    setLoading(false);
    loadConversations();
  }

  return (
    <div className="h-screen overflow-hidden p-8">
      <TopBar title="Finance Assistant" />
      <div className="mt-4 flex h-[calc(100vh-160px)] overflow-hidden rounded-xl border border-border-subtle">
        <aside className="flex w-[260px] flex-col border-r border-border-subtle bg-bg-app p-3">
          <button onClick={() => { setConversationId(""); setMessages([]); }} className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-border-subtle py-2 text-sm"><Plus size={14} />New Chat</button>
          <div className="flex-1 space-y-2 overflow-auto">
            {conversations.length === 0 ? <p className="text-sm text-text-secondary">No conversations yet</p> : conversations.map((c) => (
              <button key={c._id} onClick={() => loadConversation(c._id)} className={`w-full rounded-lg border-l-2 p-2 text-left text-xs ${conversationId === c._id ? "border-l-accent-blue bg-bg-elevated" : "border-l-transparent bg-bg-surface"}`}>
                <p className="truncate">{c.preview || c.title}</p>
                <p className="text-text-muted">{new Date(c.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </aside>
        <section className="flex flex-1 flex-col bg-bg-app">
          <div ref={ref} className="flex-1 space-y-3 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto mb-2 text-text-muted" size={48} />
                  <p className="text-2xl">Finance Assistant</p>
                  <p className="text-text-secondary">Ask me anything about your finances</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["Where did my money go this month?", "Am I overspending on food?", "Compare this month vs last month", "Give me 3 ways to cut my expenses"].map((s) => (
                      <button key={s} onClick={() => send(s)} className="rounded-full border border-border-subtle px-3 py-1 text-xs hover:bg-bg-elevated">{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "rounded-br-sm bg-accent-blue text-white" : "rounded-bl-sm bg-bg-surface text-text-primary"}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading ? <div className="inline-flex rounded-2xl rounded-bl-sm bg-bg-surface px-4 py-2">...</div> : null}
          </div>
          <div className="border-t border-border-subtle p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                rows={2}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
                }}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 resize-none rounded-xl border border-border-subtle bg-bg-input p-3"
                placeholder="Ask about spending, savings, affordability..."
              />
              <button onClick={() => send()} disabled={!input.trim()} className="h-11 self-end rounded-lg bg-accent-blue px-3 disabled:opacity-50"><ArrowUp size={16} /></button>
            </div>
            <p className="mt-1 text-xs text-text-muted">Cmd+Enter to send</p>
          </div>
        </section>
      </div>
    </div>
  );
}
