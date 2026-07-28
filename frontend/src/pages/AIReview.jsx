import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, XCircle, Brain, RefreshCw, ChevronRight } from 'lucide-react';

export default function AIReview() {
  const [highRiskExpenses, setHighRiskExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const flagged = data.filter((e) => e.risk_score === 'High' || e.risk_flags?.length > 0 || e.status === 'Submitted');
        setHighRiskExpenses(flagged);
        if (flagged.length > 0) {
          selectForAnalysis(flagged[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectForAnalysis = async (exp) => {
    setSelectedExpense(exp);
    setAiAnalysis(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ expense_data: exp })
      });
      if (res.ok) {
        const analysis = await res.json();
        setAiAnalysis(analysis);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecision = async (action) => {
    if (!selectedExpense) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/approvals/${selectedExpense.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: action,
          comments: `AI Review decision: Executed ${action}`
        })
      });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-6 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Brain className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI High-Risk Review Queue</h1>
            <p className="text-sm text-slate-400">Explainable AI Risk Evaluation & Decision Portal</p>
          </div>
        </div>
        <button
          onClick={fetchExpenses}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider px-2">
            Flagged Submissions ({highRiskExpenses.length})
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400 p-4">Loading queue...</p>
          ) : highRiskExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 p-4">No high-risk expenses pending review.</p>
          ) : (
            <div className="space-y-2">
              {highRiskExpenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => selectForAnalysis(exp)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    selectedExpense?.id === exp.id
                      ? 'bg-indigo-950/60 border-indigo-500/60'
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm text-white">{exp.title}</h3>
                      <p className="text-xs text-slate-400">{exp.employee_name} • {exp.category}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                      ${exp.amount}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {exp.risk_score || 'High'} Risk
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Detail AI Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedExpense ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedExpense.title}</h2>
                  <p className="text-sm text-slate-400">
                    Submitted by {selectedExpense.employee_name} on {selectedExpense.expense_date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">${selectedExpense.amount}</span>
                  <p className="text-xs text-slate-400">{selectedExpense.category}</p>
                </div>
              </div>

              {/* AI Recommendation Card */}
              {aiAnalysis ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Recommendation</span>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                        {aiAnalysis.recommendation}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Confidence Score</span>
                      <p className="text-lg font-bold text-emerald-400">{(aiAnalysis.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  {/* Reasons & Anomaly Flags */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase">AI Explanation & Audit Findings</h4>
                    <ul className="space-y-2">
                      {aiAnalysis.reason?.map((r, i) => (
                        <li key={i} className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/40 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {aiAnalysis.fraud_indicators?.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        Fraud & Anomaly Risk Indicators
                      </div>
                      {aiAnalysis.fraud_indicators.map((f, i) => (
                        <p key={i}>• {f}</p>
                      ))}
                    </div>
                  )}

                  {/* Decision Actions */}
                  <div className="pt-4 border-t border-slate-800 flex gap-3">
                    <button
                      onClick={() => handleDecision('Approve')}
                      disabled={actionLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Claim</span>
                    </button>
                    <button
                      onClick={() => handleDecision('Reject')}
                      disabled={actionLoading}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Claim</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Brain className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-2" />
                  Running AI analysis...
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Select an expense from the left queue to view AI findings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
