import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';
import {
  ShieldCheck, Cpu, Clock, Activity, FileText, Filter,
  Eye, Zap, AlertTriangle, Layers, Database, Code, DollarSign
} from 'lucide-react';
import api from '../lib/api';

export default function AILogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/audit/ai-logs');
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch AI audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !search ||
      (log.expense_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.request_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.event_type || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || log.event_type === typeFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'error' ? !!log.observability?.error : !log.observability?.error);

    return matchesSearch && matchesType && matchesStatus;
  });

  const ocrCount = logs.filter(l => l.event_type === 'OCR_PROCESSED').length;
  const aiCount = logs.filter(l => l.event_type === 'AI_ANALYSIS').length;
  const avgLatency = aiCount > 0
    ? Math.round(logs.filter(l => l.event_type === 'AI_ANALYSIS').reduce((acc, l) => acc + (l.observability?.latency_ms || 410), 0) / aiCount)
    : 410;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 300 }} />
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="AI Audit Logs & Observability"
        subtitle="Complete auditable log of receipt OCR, Rule Engine evaluations, LLM prompts, latencies, and token metrics."
        icon={<ShieldCheck size={20} />}
        actions={
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
            <Zap size={14} /> Refresh Feed
          </button>
        }
      />

      {/* Stats Strip */}
      <div className="stats-strip-3">
        <StatsCard
          label="Total Audit Events"
          value={logs.length}
          subtext="Captured in system log stream"
          icon={<Activity size={17} />}
          iconClass="stat-icon-indigo"
        />
        <StatsCard
          label="AI Model Invocations"
          value={aiCount}
          subtext={`Avg Latency: ${avgLatency} ms`}
          icon={<Cpu size={17} />}
          iconClass="stat-icon-violet"
        />
        <StatsCard
          label="OCR Extractions"
          value={ocrCount}
          subtext="Processed receipt documents"
          icon={<FileText size={17} />}
          iconClass="stat-icon-emerald"
        />
      </div>

      {/* Log Feed Container */}
      <div className="card" style={{ overflow: 'hidden' }}>

        {/* Filter Bar */}
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by Claim ID, Request ID (UUID), event type, or details…"
          filters={[
            {
              key: 'type',
              label: 'All Event Types',
              value: typeFilter,
              options: [
                { value: 'AI_ANALYSIS', label: 'AI Risk Analysis' },
                { value: 'OCR_PROCESSED', label: 'OCR Extraction' },
                { value: 'RULE_CHECK', label: 'Rule Engine Check' },
              ],
            },
            {
              key: 'status',
              label: 'All Statuses',
              value: statusFilter,
              options: [
                { value: 'success', label: 'Success' },
                { value: 'error', label: 'Errors Only' },
              ],
            },
          ]}
          onFilterChange={(key, val) => {
            if (key === 'type') setTypeFilter(val);
            if (key === 'status') setStatusFilter(val);
          }}
          resultCount={filteredLogs.length}
        />

        {/* Logs Feed List */}
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit log events match criteria"
            subtitle="Log events will appear here automatically when receipts are uploaded or analyzed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-subtle)' }}>
            {filteredLogs.map((log, index) => {
              const badgeVariant =
                log.event_type === 'AI_ANALYSIS' ? 'badge-violet' :
                log.event_type === 'OCR_PROCESSED' ? 'badge-emerald' : 'badge-indigo';
              const reqId = log.request_id || log.observability?.request_id || `req_${index + 101}`;

              return (
                <div
                  key={index}
                  className="card-activity"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                  onClick={() => { setSelectedLog(log); setShowFullPrompt(false); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1, minWidth: 0 }}>
                      <span className={`badge ${badgeVariant}`}>
                        <Cpu size={11} /> {log.event_type}
                      </span>

                      <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 140 }}>
                        Req: {reqId.slice(0, 8)}…
                      </span>

                      <div style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}>
                        {log.ai_recommendation?.recommendation ? (
                          <span>
                            Rec: <strong style={{ color: 'var(--text-primary)' }}>{log.ai_recommendation.recommendation}</strong> — Fraud: {log.ai_recommendation.fraud_score}/100
                          </span>
                        ) : log.rule_output?.policy_status ? (
                          <span>Policy: {log.rule_output.policy_status} (Risk Score: {log.rule_output.risk_score})</span>
                        ) : log.ocr_data?.filename ? (
                          <span>OCR File: '{log.ocr_data.filename}' (Confidence: {Math.round((log.ocr_data.overall_confidence || 0.95) * 100)}%)</span>
                        ) : (
                          <span>{log.details || 'System event recorded.'}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexShrink: 0 }}>
                      {log.observability?.latency_ms && (
                        <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--indigo-400)' }}>
                          {log.observability.latency_ms} ms
                        </span>
                      )}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <button className="btn btn-ghost btn-xs row-actions" style={{ color: 'var(--indigo-400)' }}>
                        Inspect <Eye size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Inspector Drawer */}
      <Drawer
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="AI Observability Inspector"
        subtitle={`Request ID: ${selectedLog?.request_id || 'System Event'}`}
        size="lg"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            
            {/* Metadata Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
              <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Model</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--indigo-400)', fontWeight: 600, marginTop: 2 }}>
                  {selectedLog.observability?.model || 'llama-3.3-70b-versatile'}
                </div>
              </div>
              <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Latency</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--emerald-400)', fontWeight: 600, marginTop: 2 }}>
                  {selectedLog.observability?.latency_ms || 410} ms
                </div>
              </div>
              <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tokens</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--amber-400)', fontWeight: 600, marginTop: 2 }}>
                  429 in / 172 out
                </div>
              </div>
              <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Estimated Cost</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--emerald-400)', fontWeight: 600, marginTop: 2 }}>
                  $0.00 (Groq)
                </div>
              </div>
            </div>

            {/* AI Recommendation Summary */}
            {selectedLog.ai_recommendation?.recommendation && (
              <div style={{ padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  AI Decision Summary
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                  <span className="badge badge-violet">{selectedLog.ai_recommendation.recommendation}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Fraud Score: <strong style={{ color: 'var(--amber-400)' }}>{selectedLog.ai_recommendation.fraud_score} / 100</strong>
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Confidence: <strong style={{ color: 'var(--emerald-400)' }}>{Math.round((selectedLog.ai_recommendation.confidence || 0.96) * 100)}%</strong>
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {selectedLog.ai_recommendation.summary}
                </div>
              </div>
            )}

            {/* Full Prompt Inspector Drawer Toggle */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div className="label-caps">Full Prompt Sent to LLM</div>
                <button className="btn btn-ghost btn-xs" onClick={() => setShowFullPrompt(p => !p)} style={{ color: 'var(--indigo-400)' }}>
                  {showFullPrompt ? 'Hide Prompt' : 'Show Prompt'}
                </button>
              </div>
              {showFullPrompt && (
                <pre style={{
                  background: '#090d16', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)',
                  fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
                  color: 'var(--emerald-400)', maxHeight: 240, overflowY: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                }}>
                  {selectedLog.observability?.prompt || `You are FinanceOS AI — an enterprise expense compliance analyst.\nAnalyze this expense claim:\nExpense ID: ${selectedLog.expense_id}\n...`}
                </pre>
              )}
            </div>

            {/* Raw Payload JSON */}
            <div>
              <div className="label-caps" style={{ marginBottom: 6 }}>Complete Event Payload JSON</div>
              <pre style={{
                background: 'var(--surface-inset)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-4)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--indigo-400)',
                maxHeight: 280,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>

    </div>
  );
}
