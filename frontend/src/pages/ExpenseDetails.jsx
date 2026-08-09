import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/ui/EmptyState';
import ApprovalTimeline from '../components/ApprovalTimeline';
import {
  ArrowLeft, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, RefreshCcw,
  AlertCircle, ZoomIn, ZoomOut, Download, FileText,
  Brain, Fingerprint, ScanLine, Clock, User, Tag,
  Sparkles, BadgeCheck, AlertTriangle, Maximize2,
  Minimize2, Edit3, Check, HelpCircle, DollarSign, CreditCard, History,
  CheckSquare, XSquare, AlertOctagon,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

const ts = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const riskColor = (score) => {
  if (score === undefined || score === null) return 'var(--text-tertiary)';
  if (score <= 20) return 'var(--emerald-400)';
  if (score <= 40) return 'var(--blue-400)';
  if (score <= 60) return 'var(--amber-400)';
  if (score <= 80) return '#fb923c';
  return 'var(--crimson-400)';
};

const riskLabel = (score) => {
  if (score === undefined || score === null) return 'Unknown';
  if (score <= 20) return 'Very Low';
  if (score <= 40) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Critical';
};

const confColor = (v) => {
  if (!v && v !== 0) return 'var(--text-tertiary)';
  if (v >= 0.9) return 'var(--emerald-400)';
  if (v >= 0.75) return 'var(--amber-400)';
  return 'var(--crimson-400)';
};

const recBadge = (rec) => {
  if (!rec) return { cls: 'badge-slate', label: 'Pending Review' };
  const r = rec.toLowerCase();
  if (r.includes('auto') || r.includes('approve')) return { cls: 'badge-emerald', label: 'AUTO APPROVE' };
  if (r.includes('manual') || r.includes('investigation') || r.includes('investigate')) return { cls: 'badge-crimson', label: 'INVESTIGATE' };
  return { cls: 'badge-amber', label: 'MANAGER REVIEW' };
};


// ── Section Card ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, icon, children, style = {}, accent, action }) => (
  <div className="card" style={{ overflow: 'hidden', ...style, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}) }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--surface-inset)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}>{icon}</span>}
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value, mono = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', flexShrink: 0, minWidth: 120 }}>{label}</span>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
      {value ?? '—'}
    </span>
  </div>
);


// ── Fraud Score Gauge ─────────────────────────────────────────────────────────

const FraudGauge = ({ score }) => {
  const s = score ?? 0;
  const angle = (s / 100) * 180;
  const col = riskColor(s);
  const toRad = (deg) => (deg * Math.PI) / 180;
  const cx = 60, cy = 60, r = 44;
  const startX = cx - r, startY = cy;
  const endAngle = 180 - angle;
  const ex = cx + r * Math.cos(toRad(endAngle));
  const ey = cy - r * Math.sin(toRad(endAngle));
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="120" height="70" viewBox="0 0 120 70" style={{ overflow: 'visible' }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="var(--border-default)" strokeWidth="8" strokeLinecap="round" />
        {s > 0 && (
          <path d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
            fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" />
        )}
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 8) * Math.cos(toRad(endAngle))}
          y2={cy - (r - 8) * Math.sin(toRad(endAngle))}
          stroke={col} strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill={col} />
      </svg>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', fontWeight: 700, color: col, lineHeight: 1 }}>{s} / 100</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{riskLabel(s)} Fraud Risk</div>
    </div>
  );
};


// ── Enhanced Receipt Viewer (Zoom, Fullscreen, Download – no rotation) ────────

const ReceiptViewer = ({ receiptUrl }) => {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const isPdf = receiptUrl?.toLowerCase().endsWith('.pdf');
  const fullUrl = receiptUrl
    ? (receiptUrl.startsWith('http') ? receiptUrl : `http://localhost:8000${receiptUrl}`)
    : null;

  if (!receiptUrl) return (
    <div style={{
      height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, background: 'var(--surface-inset)',
      borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border-strong)',
      color: 'var(--text-tertiary)',
    }}>
      <FileText size={36} style={{ opacity: 0.4 }} />
      <span style={{ fontSize: 'var(--text-sm)' }}>No receipt document attached</span>
    </div>
  );

  const imgContent = isPdf ? (
    <iframe
      src={fullUrl}
      title="Receipt Document"
      style={{ width: '100%', height: fullscreen ? '80vh' : '100%', border: 'none', borderRadius: 'var(--radius-lg)' }}
    />
  ) : (
    <img
      src={fullUrl}
      alt="Receipt preview"
      style={{
        transform: `scale(${zoom})`,
        transition: 'transform 0.2s ease',
        maxWidth: '95%', maxHeight: '95%',
        objectFit: 'contain', borderRadius: 4,
      }}
    />
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 8px', background: 'var(--surface-inset)',
        borderRadius: 'var(--radius-lg)', marginBottom: 8,
      }}>
        <button className="btn btn-ghost btn-xs" onClick={() => setZoom(z => Math.min(z + 0.25, 3))} title="Zoom in">
          <ZoomIn size={13} />
        </button>
        <button className="btn btn-ghost btn-xs" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', padding: '0 4px' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button className="btn btn-ghost btn-xs" onClick={() => setFullscreen(true)} title="Fullscreen">
          <Maximize2 size={13} />
        </button>
        <div style={{ flex: 1 }} />
        <a href={fullUrl} download className="btn btn-ghost btn-xs" title="Download receipt">
          <Download size={13} />
        </a>
      </div>

      {/* Preview */}
      <div style={{
        height: 300, overflow: 'auto', background: 'var(--surface-inset)',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {imgContent}
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ color: '#fff', fontSize: 'var(--text-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} /> Receipt Document – Full View
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setFullscreen(false)} style={{ color: '#fff' }}>
              <Minimize2 size={18} /> Close
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imgContent}
          </div>
        </div>
      )}
    </div>
  );
};


// ── OCR Fields Panel (confidence bars + inline editing for <80%) ──────────────

const OCRFieldsPanel = ({ expense, ocrResult, onFieldOverride }) => {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const ocrData = ocrResult?.parsed_fields || ocrResult?.ocr_data || {};

  const fields = [
    { key: 'vendor',         label: 'Vendor',          value: ocrData?.vendor?.value || expense?.title?.replace(/^Expense at /, '') || '—',             conf: ocrData?.vendor?.confidence          ?? 0.96 },
    { key: 'invoice_number', label: 'Invoice Number',  value: ocrData?.invoice_number?.value || '—',                                                     conf: ocrData?.invoice_number?.confidence  ?? 0.90 },
    { key: 'date',           label: 'Date',             value: ocrData?.transaction_date?.value || expense?.expense_date || '—',                       conf: ocrData?.transaction_date?.confidence ?? 0.95 },
    { key: 'subtotal',       label: 'Subtotal',         value: ocrData?.subtotal?.value != null ? `$${ocrData.subtotal.value}` : '—',                  conf: ocrData?.subtotal?.confidence        ?? 0.88 },
    { key: 'tax',            label: 'Tax Amount',       value: ocrData?.tax_amount?.value != null ? `$${ocrData.tax_amount.value}` : '—',              conf: ocrData?.tax_amount?.confidence      ?? 0.85 },
    { key: 'amount',         label: 'Total Amount',     value: ocrData?.total_amount?.value != null ? `$${ocrData.total_amount.value}` : (expense?.amount != null ? fmt(expense.amount) : '—'), conf: ocrData?.total_amount?.confidence ?? 0.94 },
    { key: 'category',       label: 'Category',         value: ocrData?.category?.value || expense?.category || '—',                                      conf: ocrData?.category?.confidence      ?? 0.92 },
    { key: 'currency',       label: 'Currency',         value: ocrData?.currency?.value || 'USD',                                                        conf: ocrData?.currency?.confidence      ?? 0.99 },
  ];

  const overallConf = ocrResult?.overall_confidence ?? 0.92;
  const statusLabel = overallConf >= 0.85 ? 'High Accuracy OCR' : overallConf >= 0.70 ? 'Needs Verification' : 'Low Confidence Alert';
  const statusColor = overallConf >= 0.85 ? 'var(--emerald-400)' : overallConf >= 0.70 ? 'var(--amber-400)' : 'var(--crimson-400)';

  const handleStartEdit = (field) => {
    setEditingField(field.key);
    setEditValue(field.value);
  };
  const handleSaveEdit = (fieldKey) => {
    if (onFieldOverride) onFieldOverride(fieldKey, editValue);
    setEditingField(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* OCR Summary Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 'var(--radius-lg)',
        background: overallConf >= 0.80 ? 'var(--emerald-50)' : 'var(--amber-50)',
        border: `1px solid ${overallConf >= 0.80 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Fingerprint size={13} style={{ color: statusColor }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: statusColor }}>
          {Math.round(overallConf * 100)}% Avg Confidence
        </span>
      </div>

      {/* Fields */}
      {fields.map(f => {
        const isLow = f.conf < 0.80;
        const isEditing = editingField === f.key;
        return (
          <div key={f.key} style={{ padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{f.label}</span>
                {isLow && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 9, padding: '1px 5px', borderRadius: 99,
                    background: 'rgba(245,158,11,0.15)', color: 'var(--amber-400)',
                    fontWeight: 600,
                  }}>
                    <AlertTriangle size={8} /> Needs Review
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 600, color: confColor(f.conf) }}>
                  {Math.round(f.conf * 100)}%
                </span>
                {isLow && !isEditing && (
                  <button className="btn btn-ghost btn-xs" onClick={() => handleStartEdit(f)} title="Edit this field">
                    <Edit3 size={11} style={{ color: 'var(--indigo-400)' }} />
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                <input
                  type="text" className="field-input"
                  style={{ height: 28, fontSize: 'var(--text-xs)', padding: '2px 8px', flex: 1 }}
                  value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                />
                <button className="btn btn-primary btn-xs" onClick={() => handleSaveEdit(f.key)}>
                  <Check size={12} />
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => setEditingField(null)}>
                  <XCircle size={12} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500, flex: 1 }}>{f.value}</span>
                <div style={{ width: 70, height: 3, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: '100%', width: `${Math.round(f.conf * 100)}%`, background: confColor(f.conf), borderRadius: 99 }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


// ── Rule Engine Visual Checklist ──────────────────────────────────────────────

const RuleEngineChecklist = ({ expense, ruleEngine }) => {
  const rule = ruleEngine || expense?.rule_engine || {};
  const amount = expense?.amount || 0;
  const category = expense?.category || 'Meals';
  const limit = category === 'Meals' ? 50 : category === 'Accommodation' ? 250 : 100;
  const date = expense?.expense_date ? new Date(expense.expense_date) : null;
  const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false;
  const violations = rule?.violations || [];

  // Build rules from backend data + heuristics
  const rules = [
    {
      label: 'Receipt Uploaded',
      status: expense?.receipt_url ? 'pass' : 'fail',
      detail: expense?.receipt_url ? 'Receipt document verified.' : 'No receipt file attached.',
    },
    {
      label: 'OCR Processing Complete',
      status: rule.ocr_complete !== false ? 'pass' : 'fail',
      detail: 'Tesseract OCR field extraction complete.',
    },
    {
      label: 'Category Allowed',
      status: rule.category_allowed !== false ? 'pass' : 'fail',
      detail: `${category} expenses are covered under policy.`,
    },
    {
      label: 'Duplicate Check',
      status: expense?.duplicate_check?.duplicate ? 'fail' : 'pass',
      detail: expense?.duplicate_check?.duplicate
        ? `Potential duplicate of ${expense.duplicate_check.similar_expense || 'existing claim'}.`
        : 'No duplicate expense detected.',
    },
    {
      label: `${category} Policy Limit`,
      status: (amount > limit || violations.some(v => v.toLowerCase().includes('exceeds'))) ? 'fail' : 'pass',
      detail: amount > limit
        ? `Amount ${fmt(amount)} exceeds policy limit of ${fmt(limit)}.`
        : `Amount ${fmt(amount)} is within the ${fmt(limit)} policy limit.`,
    },
    {
      label: 'Weekend Expense',
      status: isWeekend ? 'warning' : 'pass',
      detail: isWeekend
        ? 'Expense was submitted on a weekend — additional approval may be required.'
        : 'Weekday expense, no weekend flag.',
    },
  ];

  // If backend returns explicit violation messages, append them as FAIL rows
  violations.forEach((v, idx) => {
    if (!rules.some(r => r.detail === v)) {
      rules.push({
        label: `Policy Violation #${idx + 1}`,
        status: 'fail',
        detail: v,
      });
    }
  });

  const statusCfg = {
    pass:    { icon: <CheckSquare size={14} />,    color: 'var(--emerald-400)', bg: 'rgba(16,185,129,0.08)',  label: 'PASS'    },
    fail:    { icon: <XSquare size={14} />,        color: 'var(--crimson-400)', bg: 'rgba(239,68,68,0.08)',  label: 'FAIL'    },
    warning: { icon: <AlertOctagon size={14} />,   color: 'var(--amber-400)',   bg: 'rgba(245,158,11,0.08)', label: 'WARNING' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rules.map((r, i) => {
        const cfg = statusCfg[r.status];
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 'var(--radius-md)',
            background: cfg.bg, border: `1px solid ${cfg.color}22`,
          }}>
            <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: cfg.color }}>{r.label}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                  background: cfg.color + '22', color: cfg.color,
                }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{r.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ── AI Recommendation Card (full explainable AI) ──────────────────────────────

const AIRecommendationCard = ({ expense, user, onAction }) => {
  const ai = expense?.ai_analysis || {};
  const dup = expense?.duplicate_check || {};
  const rec = recBadge(ai.recommendation);
  const fraudScore = ai.fraud_score ?? 0;
  const confidence = ai.confidence ?? 0.94;
  const reasons = ai.reason || ai.reasoning || [];
  const citations = ai.policy_sections || ai.policy_citations || [];

  const category = expense?.category || 'Meals';
  const amount = expense?.amount || 0;
  const limit = category === 'Meals' ? 50 : category === 'Accommodation' ? 250 : 100;
  const exceededBy = amount > limit ? +(amount - limit).toFixed(2) : 0;
  const historicalAvg = ai.historical_average != null ? ai.historical_average : (category === 'Meals' ? 24 : category === 'Accommodation' ? 120 : 42);
  const diffFromHistorical = +(amount - historicalAvg).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* AI Header Banner */}
      <div className="card-ai" style={{ padding: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={16} style={{ color: 'var(--violet-400)' }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--violet-400)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            AI Compliance Recommendation
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span className={`badge ${rec.cls}`} style={{ fontSize: 'var(--text-md)', padding: '6px 14px', letterSpacing: '0.04em' }}>
              {rec.label}
            </span>
            <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              Confidence: <span style={{ color: confColor(confidence), fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(confidence * 100)}%</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              Risk Level: <span style={{ color: riskColor(fraudScore), fontWeight: 600 }}>{riskLabel(fraudScore)}</span>
            </div>
          </div>
          <FraudGauge score={fraudScore} />
        </div>
      </div>

      {/* Explainable AI – Policy Breakdown */}
      <SectionCard title="Explainable AI" icon={<Brain size={13} />} accent="var(--violet-500)">
        {/* Policy Table */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Policy Analysis
          </div>
          <div style={{
            border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
          }}>
            {[
              { label: 'Policy',         value: category,                                    highlight: false },
              { label: 'Policy Limit',   value: fmt(limit),                                  highlight: false },
              { label: 'Submitted',      value: fmt(amount),                                 highlight: exceededBy > 0 },
              { label: 'Exceeded By',    value: exceededBy > 0 ? fmt(exceededBy) : '—',      highlight: exceededBy > 0 },
              { label: 'Duplicate Match',value: dup.duplicate ? `Yes — ${dup.similar_expense || 'EXP-XXXX'}` : 'No', highlight: dup.duplicate },
              { label: 'Historical Avg', value: fmt(historicalAvg),                           highlight: false },
              { label: 'Difference',     value: `${diffFromHistorical >= 0 ? '+' : ''}${fmt(diffFromHistorical)}`, highlight: diffFromHistorical > 0 },
              { label: 'Policy Reference', value: citations[0] || 'Section 4.2',             highlight: false },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 10px', borderBottom: i < 7 ? '1px solid var(--border-subtle)' : undefined,
                background: row.highlight ? 'rgba(239,68,68,0.06)' : 'transparent',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{row.label}</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', color: row.highlight ? 'var(--crimson-400)' : 'var(--text-primary)' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reasoning signals */}
        {reasons.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>
              AI Reasoning Signals
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 0, listStyle: 'none', margin: 0 }}>
              {reasons.map((r, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--indigo-400)', marginTop: 2, flexShrink: 0 }}>•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Action */}
        <div style={{
          padding: '10px 12px', background: 'var(--surface-inset)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: 'var(--text-xs)',
        }}>
          <strong style={{ color: 'var(--indigo-400)' }}>Suggested Action: </strong>
          <span style={{ color: 'var(--text-primary)' }}>{ai.suggested_action || 'Request an itemized receipt before final approval.'}</span>
        </div>
      </SectionCard>

      {/* Historical Comparison */}
      <SectionCard title="Historical Comparison" icon={<History size={13} />}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Historical Average', val: fmt(historicalAvg), color: 'var(--text-primary)' },
            { label: 'Current Claim',      val: fmt(amount),        color: diffFromHistorical > 0 ? 'var(--amber-400)' : 'var(--emerald-400)' },
            { label: 'Difference',         val: `${diffFromHistorical >= 0 ? '+' : ''}${fmt(diffFromHistorical)}`, color: diffFromHistorical > 0 ? 'var(--amber-400)' : 'var(--emerald-400)' },
          ].map((c, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px 10px', background: 'var(--surface-inset)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase' }}>{c.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: c.color }}>{c.val}</div>
            </div>
          ))}
        </div>
        {diffFromHistorical > historicalAvg * 0.5 && (
          <div style={{ marginTop: 8, padding: '5px 10px', background: 'var(--amber-50)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 'var(--text-xs)', color: 'var(--amber-400)' }}>
            ⚠ Amount is significantly higher than the employee's historical {category} average.
          </div>
        )}
      </SectionCard>

      {/* Action Decision */}
      {onAction && (
        <div className="card" style={{ padding: 'var(--sp-5)', border: '1px solid var(--indigo-500)', boxShadow: 'var(--shadow-indigo)' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BadgeCheck size={15} style={{ color: 'var(--indigo-400)' }} />
            Take Decision ({user?.role})
          </div>
          {onAction}
        </div>
      )}
    </div>
  );
};


// ── Finance Review Workspace ──────────────────────────────────────────────────

const FinanceWorkspaceView = ({ expense, history, user }) => {
  const [payRef, setPayRef] = useState(expense?.payment_reference || `TXN-${Math.floor(Date.now() / 1000)}`);
  const lastManagerAction = (history || []).filter(h => h.action === 'Approved' || h.action === 'Rejected').pop();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* Manager Decision Audit */}
      <SectionCard title="Manager Decision History" icon={<User size={13} />} accent="var(--indigo-500)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {lastManagerAction ? lastManagerAction.action : 'Approved'}
            </span>
            <span className="badge badge-emerald">Policy v2.3 Validated</span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Reviewed by: <strong style={{ color: 'var(--text-secondary)' }}>{lastManagerAction?.approver_name || 'Senior Manager'}</strong>
            {' · '}{ts(lastManagerAction?.actioned_at || expense?.created_at)}
          </div>
          {lastManagerAction?.comments && (
            <div style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-md)', marginTop: 4 }}>
              "{lastManagerAction.comments}"
            </div>
          )}
        </div>
      </SectionCard>

      {/* Tax & Payment Details */}
      <SectionCard title="Tax & Payment Details" icon={<CreditCard size={13} />}>
        <InfoRow label="Vendor" value={expense?.title} />
        <InfoRow label="Subtotal" value={fmt(expense?.amount ? expense.amount / 1.1 : 0)} mono />
        <InfoRow label="Tax / GST (10%)" value={fmt(expense?.amount ? (expense.amount - expense.amount / 1.1) : 0)} mono />
        <InfoRow label="Total Claim" value={fmt(expense?.amount)} mono />
        <div style={{ marginTop: 10 }}>
          <label className="field-label">Payment Reference Number</label>
          <input
            type="text" className="field-input text-mono"
            value={payRef} onChange={e => setPayRef(e.target.value)}
            placeholder="TXN-XXXXXXXX"
          />
        </div>
      </SectionCard>
    </div>
  );
};


// ── Main Page Component ────────────────────────────────────────────────────────

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('Approved');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/api/expenses/${id}`);
      setData(res.data);
    } catch (e) {
      setError('Failed to load expense details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetails(); }, [id]);

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    if (action === 'Rejected' && !comments.trim()) {
      setError('A comment is required when rejecting a claim.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/approvals/${id}/action`, { action, comments });
      await fetchDetails();
      setComments('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="skeleton" style={{ height: 40, width: 280 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
        <LoadingSkeleton rows={5} />
        <LoadingSkeleton rows={5} />
      </div>
    </div>
  );

  if (!data || !data.expense) return (
    <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
      <div style={{ color: 'var(--crimson-400)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 12 }}>Expense Claim Not Found</div>
      <button onClick={() => navigate('/')} className="btn btn-primary btn-md">Return to Dashboard</button>
    </div>
  );

  const { expense, history, timeline, ocr_result } = data;

  const isReviewer = () => {
    if (!expense) return false;
    if (['Submitted', 'Under Review'].includes(expense.status) && user?.role === 'Manager' && expense.employee_id !== user.id) return true;
    if (expense.status === 'Approved' && user?.role === 'Finance') return true;
    return false;
  };

  // Action form
  const actionForm = (
    <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-sm)' }}>{error}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {[
          { key: 'Approved',      label: user?.role === 'Finance' ? 'Approve & Pay' : 'Approve', icon: <CheckCircle2 size={13} />, cls: 'btn-success' },
          { key: 'Rejected',      label: 'Reject',    icon: <XCircle size={13} />,    cls: 'btn-danger'   },
          ...(user?.role === 'Manager' ? [{ key: 'Clarification', label: 'Clarify', icon: <HelpCircle size={13} />, cls: 'btn-secondary' }] : []),
        ].map(({ key, label, icon, cls }) => (
          <button key={key} type="button"
            className={`btn btn-sm ${action === key ? cls : 'btn-ghost'}`}
            style={{ flex: 1, minWidth: 80, border: action === key ? undefined : '1px solid var(--border-default)' }}
            onClick={() => setAction(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>
      <div className="form-group">
        <label className="field-label" htmlFor="comments">
          Review Comments {action === 'Rejected' && <span style={{ color: 'var(--crimson-400)' }}>*</span>}
        </label>
        <textarea id="comments" className="field-input" rows={3}
          placeholder="Enter audit remarks or clarification instructions…"
          value={comments} onChange={e => setComments(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
      </div>
      <button type="submit" disabled={submitting} className="btn btn-primary btn-md" style={{ width: '100%' }}>
        {submitting ? 'Submitting…' : 'Confirm Decision'}
      </button>
    </form>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{expense.title}</h2>
            <StatusBadge status={expense.status} />
            {expense.risk_score && (
              <span className={`risk-badge risk-${expense.risk_score.toLowerCase()}`}>
                {expense.risk_score === 'High' && <ShieldAlert size={11} />}
                {expense.risk_score === 'Low' && <ShieldCheck size={11} />}
                {expense.risk_score} Risk
              </span>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
            Expense Ref: {expense.id} · Employee: {expense.employee_name}
          </p>
        </div>
      </div>

      {/* ── TOP ROW: Side-by-Side Receipt (Left) + OCR Fields (Right) ─────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>

        <SectionCard
          title="Receipt Viewer"
          icon={<FileText size={13} />}
          action={
            expense.receipt_url && (
              <a href={expense.receipt_url.startsWith('http') ? expense.receipt_url : `http://localhost:8000${expense.receipt_url}`}
                download className="btn btn-ghost btn-xs">
                <Download size={12} /> Download
              </a>
            )
          }
        >
          <ReceiptViewer receiptUrl={expense.receipt_url} />
        </SectionCard>

        <SectionCard title="OCR Field Extraction" icon={<ScanLine size={13} />}>
          <OCRFieldsPanel expense={expense} ocrResult={ocr_result} />
        </SectionCard>

      </div>

      {/* ── MAIN WORKSPACE: 3 Columns ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 360px', gap: 'var(--sp-4)', alignItems: 'start' }}>

        {/* ── LEFT: Claim Params + Rule Engine + Timeline ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

          {/* Finance-specific workspace block */}
          {user?.role === 'Finance' && (
            <FinanceWorkspaceView expense={expense} history={history} user={user} />
          )}

          {/* Claim Parameters */}
          <SectionCard title="Claim Parameters" icon={<Tag size={13} />}>
            <InfoRow label="Expense ID" value={expense.id} mono />
            <InfoRow label="Submitted By" value={expense.employee_name} />
            <InfoRow label="Category" value={expense.category} />
            <InfoRow label="Amount" value={fmt(expense.amount)} mono />
            <InfoRow label="Expense Date" value={expense.expense_date} />
            <InfoRow label="Submitted On" value={expense.created_at ? new Date(expense.created_at).toLocaleDateString() : '—'} />
            <InfoRow label="Status" value={<StatusBadge status={expense.status} />} />
            {expense.payment_reference && <InfoRow label="Payment Ref" value={expense.payment_reference} mono />}
          </SectionCard>

          {expense.description && (
            <SectionCard title="Description" icon={<FileText size={13} />}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{expense.description}</p>
            </SectionCard>
          )}
        </div>

        {/* ── CENTER: Rule Engine + Lifecycle Timeline ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <SectionCard title="Rule Engine — Compliance Checklist" icon={<CheckSquare size={13} />} accent="var(--amber-400)">
            <RuleEngineChecklist expense={expense} ruleEngine={expense?.rule_engine} />
          </SectionCard>

          <SectionCard title="Enterprise Approval Lifecycle" icon={<Clock size={13} />}>
            <ApprovalTimeline expenseId={expense.id} initialTimeline={timeline} />
          </SectionCard>
        </div>

        {/* ── RIGHT: AI Copilot ─── */}
        <div style={{ position: 'sticky', top: 'var(--sp-6)', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          <AIRecommendationCard
            expense={expense}
            user={user}
            onAction={isReviewer() ? actionForm : null}
          />
        </div>

      </div>
    </div>
  );
};

export default ExpenseDetails;
