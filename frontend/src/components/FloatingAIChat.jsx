import React, { useState } from 'react';
import { X, Send, Bot, User, Sparkles, MessageSquare } from 'lucide-react';

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your FinanceOS Copilot. Ask me anything about corporate expense policies, receipt rules, or reimbursement guidelines.'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: 'ai', text: data.reply, sources: data.sources }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, I encountered an issue processing your request.' }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Network connection issue. Please check your server status.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 'var(--sp-6)', right: 'var(--sp-6)', zIndex: 150 }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-ai btn-lg"
          style={{ borderRadius: 'var(--radius-full)', padding: '12px 20px', gap: 'var(--sp-2)' }}
        >
          <Sparkles size={16} className="animate-pulse" style={{ color: '#fbbf24' }} />
          <span>Ask Finance AI</span>
        </button>
      ) : (
        <div style={{
          width: 380,
          height: 520,
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }} className="animate-scale-in">

          {/* Copilot Header */}
          <div style={{
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'var(--surface-overlay)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-md)',
                background: 'var(--violet-100)', color: 'var(--violet-400)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={15} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  FinanceOS Copilot
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  Policy Grounded AI Assistant
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="btn btn-ghost btn-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Chat Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
            background: 'var(--surface-inset)',
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 'var(--sp-2)',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {m.sender === 'ai' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--violet-100)', color: 'var(--violet-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <Bot size={13} />
                  </div>
                )}

                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: 'var(--radius-xl)',
                  fontSize: 'var(--text-xs)',
                  lineHeight: 1.5,
                  background: m.sender === 'user' ? 'var(--indigo-500)' : 'var(--surface-overlay)',
                  color: m.sender === 'user' ? '#fff' : 'var(--text-primary)',
                  border: m.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                }}>
                  <p>{m.text}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                    }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>Grounding Policy:</strong>
                      <ul style={{ paddingLeft: 12, marginTop: 2 }}>
                        {m.sources.map((s, i) => (
                          <li key={i}>{s.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--indigo-100)', color: 'var(--indigo-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                <Bot size={14} className="animate-spin" style={{ color: 'var(--violet-400)' }} />
                <span>Searching vector policy database…</span>
              </div>
            )}
          </div>

          {/* Quick Action Chips */}
          <div style={{
            padding: '6px 12px',
            background: 'var(--surface-raised)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
          }}>
            {[
              'Meal allowance cap?',
              'Hotel limit per night?',
              'Receipt requirements?'
            ].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className="btn btn-ghost btn-xs text-mono"
                style={{
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  padding: '3px 8px',
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <form onSubmit={sendMessage} style={{
            padding: 'var(--sp-3)',
            background: 'var(--surface-overlay)',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            gap: 'var(--sp-2)',
          }}>
            <input
              type="text"
              className="field-input"
              style={{ height: 34, fontSize: 'var(--text-xs)' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a policy or expense question…"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary btn-sm"
              style={{ width: 34, height: 34, padding: 0 }}
            >
              <Send size={13} />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
