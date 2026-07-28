import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatsCard } from '../components/ui/StatsCard';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';
import { Badge } from '../components/ui/RiskBadge';
import {
  ShieldCheck, Cpu, Clock, Activity, FileText, Filter,
  Eye, Zap, AlertTriangle, Layers, Database
} from 'lucide-react';

export default function AILogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/audit/ai-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !search ||
      (log.expense_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.event_type || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || log.event_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const ocrCount = logs.filter(l => l.event_type === 'OCR_PROCESSED').length;
  const aiCount = logs.filter(l => l.event_type === 'AI_ANALYSIS').length;
  const ruleCount = logs.filter(l => l.event_type === 'RULE_CHECK' || l.event_type === 'POLICY_CHECK').length;

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
        subtitle="Complete auditable log of receipt OCR, Rule Engine evaluations, AI decisions, and system events."
        icon={<ShieldCheck size={20} />}
        actions={
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
            <Zap size={14} /> Refresh Feed
          </button>
        }
      />

      {/* Stats Row */}
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
          subtext="LLM risk analysis & recommendations"
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
          searchPlaceholder="Search log events, claim ID, or details…"
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
          ]}
          onFilterChange={(key, val) => setTypeFilter(val)}
          resultCount={filteredLogs.length}
        />

        {/* Logs Feed List */}
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit log events recorded"
            subtitle="Log events will appear here automatically when receipts are uploaded or analyzed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-subtle)' }}>
            {filteredLogs.map((log, index) => {
              const badgeVariant =
                log.event_type === 'AI_ANALYSIS' ? 'badge-violet' :
                log.event_type === 'OCR_PROCESSED' ? 'badge-emerald' : 'badge-indigo';

              return (
                <div
                  key={index}
                  className="card-activity"
                  style={{ borderRadius: 0, cursor: 'pointer' }}
                  onClick={() => setSelectedLog(log)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1, minWidth: 0 }}>
                      <span className={`badge ${badgeVariant}`}>
                        <Cpu size={11} /> {log.event_type}
                      </span>

                      <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        Claim ID: {log.expense_id || log.user_id || 'System'}
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
                            Recommendation: <strong style={{ color: 'var(--text-primary)' }}>{log.ai_recommendation.recommendation}</strong> — {log.ai_recommendation.summary}
                          </span>
                        ) : log.rule_output?.policy_status ? (
                          <span>Policy Status: {log.rule_output.policy_status} (Risk Score: {log.rule_output.risk_score})</span>
                        ) : log.ocr_data?.filename ? (
                          <span>OCR File: '{log.ocr_data.filename}' (Confidence: {log.ocr_data.overall_confidence})</span>
                        ) : (
                          <span>{log.details || 'System activity event recorded.'}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexShrink: 0 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
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
        title="Log Event Inspector"
        subtitle={`Event Type: ${selectedLog?.event_type || 'System Event'}`}
        size="lg"
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', padding: 'var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div className="label-caps">Timestamp</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', marginTop: 4 }}>
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="label-caps">Claim ID / User</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', marginTop: 4 }}>
                  {selectedLog.expense_id || selectedLog.user_id || 'System'}
                </div>
              </div>
            </div>

            <div>
              <div className="label-caps" style={{ marginBottom: 6 }}>Payload / Execution Finding</div>
              <pre style={{
                background: 'var(--surface-inset)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-4)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--indigo-400)',
                overflowX: 'auto',
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
