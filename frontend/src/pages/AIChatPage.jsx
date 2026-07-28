import React, { useState } from 'react';
import { Bot, User, Send, Sparkles, BookOpen, ShieldQuestion, HelpCircle } from 'lucide-react';

export default function AIChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Welcome to FinanceOS AI Chat Assistant! I can answer expense rules, policy questions, rejection explanations, and status updates.'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: query })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: 'ai', text: data.reply, sources: data.sources }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Apologies, I could not process your query at this time.' }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Network connection issue.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Finance Assistant</h1>
            <p className="text-sm text-slate-400">Conversational Policy Guidance & Expense Assistant</p>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => sendMessage('Can I claim hotel expenses above $300?')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3.5 rounded-xl text-left transition-all text-xs"
        >
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Hotel Limit Policy</span>
          </div>
          <p className="text-slate-400">"Can I claim hotel expenses above $300?"</p>
        </button>

        <button
          onClick={() => sendMessage('Why was my expense rejected?')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3.5 rounded-xl text-left transition-all text-xs"
        >
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <ShieldQuestion className="w-4 h-4" />
            <span>Rejection Explanation</span>
          </div>
          <p className="text-slate-400">"Why was my expense rejected?"</p>
        </button>

        <button
          onClick={() => sendMessage('What is the maximum meal reimbursement?')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3.5 rounded-xl text-left transition-all text-xs"
        >
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Meal Cap Query</span>
          </div>
          <p className="text-slate-400">"What is the maximum meal reimbursement?"</p>
        </button>
      </div>

      {/* Main Chat Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl h-[500px] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm bg-slate-950/40">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                }`}
              >
                <p>{m.text}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Policy References:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {m.sources.map((s, i) => (
                        <li key={i}>{s.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 text-slate-400 text-sm items-center">
              <Bot className="w-5 h-5 text-indigo-400 animate-spin" />
              <span>AI Assistant is referencing vector knowledge base...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your policy or expense question..."
            className="flex-1 bg-slate-950 border border-slate-700/70 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
