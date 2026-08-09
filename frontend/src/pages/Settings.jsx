import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { ShieldCheck, ShieldAlert, Check } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [receiptRequired, setReceiptRequired] = useState(true);
  const [duplicateDays, setDuplicateDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchPolicies = async () => {
    try {
      const res = await api.get('/api/admin/policies');
      setPolicies(res.data);
      if (res.data.length > 0) loadPolicy(res.data[0], res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadPolicy = (p, list = policies) => {
    const policy = (list || policies).find(x => x.category === (p.category || p));
    if (policy) {
      setSelected(policy.category);
      setMaxLimit(policy.max_limit.toString());
      setReceiptRequired(policy.receipt_required);
      setDuplicateDays(policy.duplicate_window_days || 30);
    }
  };

  useEffect(() => { if (user?.role === 'Admin') fetchPolicies(); else setLoading(false); }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.put('/api/admin/policies', {
        category: selected,
        max_limit: parseFloat(maxLimit),
        receipt_required: receiptRequired,
        duplicate_window_days: duplicateDays
      });
      setMsg(`Policy for "${selected}" updated successfully.`);
      await fetchPolicies();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (user?.role !== 'Admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center', maxWidth: 420 }}>
          <ShieldAlert size={40} style={{ color: 'var(--crimson-400)', margin: '0 auto var(--sp-4)' }} />
          <div className="section-title" style={{ marginBottom: 8 }}>Access Restricted</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
            Only System Administrators can configure expense policies.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div className="skeleton" style={{ height: 40, width: 240 }} />
      <div className="skeleton" style={{ height: 300 }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Expense Policies
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Configure reimbursement limits, receipt requirements, and duplicate detection windows.
        </p>
      </div>

      {msg && (
        <div className="alert alert-success">
          <Check size={15} style={{ flexShrink: 0 }} />
          <span>{msg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>
        {/* Policy Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border-default)' }}>
            <span className="section-title">Active Policy Limits</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Max Limit ($)</th>
                <th>Receipt Required</th>
                <th className="col-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.category} onClick={() => loadPolicy(p)}
                    style={{ cursor: 'pointer', background: selected === p.category ? 'var(--indigo-50)' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{p.category}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>${parseFloat(p.max_limit).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${p.receipt_required ? 'badge-emerald' : 'badge-slate'}`}>
                      {p.receipt_required ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td className="col-right">
                    <button className="btn btn-ghost btn-xs row-actions" style={{ color: 'var(--indigo-400)' }}>
                      Select →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Form */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-5)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--indigo-400)' }} />
            <span className="section-title">Edit Policy: {selected}</span>
          </div>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="field-label">Category</label>
              <input type="text" className="field-input" value={selected} disabled style={{ opacity: 0.5 }} />
            </div>
            <div className="form-group">
              <label className="field-label" htmlFor="maxLimit">Max Limit ($)</label>
              <input id="maxLimit" type="number" step="0.01" required className="field-input"
                value={maxLimit} onChange={e => setMaxLimit(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="field-label" htmlFor="dupDays">Duplicate Window (Days)</label>
              <input id="dupDays" type="number" required className="field-input"
                value={duplicateDays} onChange={e => setDuplicateDays(parseInt(e.target.value))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--sp-3) var(--sp-4)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <input id="reqReceipt" type="checkbox" checked={receiptRequired}
                onChange={e => setReceiptRequired(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--indigo-500)', cursor: 'pointer' }} />
              <label htmlFor="reqReceipt" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}>
                Receipt Upload Mandatory
              </label>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary btn-md" style={{ width: '100%', marginTop: 4 }}>
              {saving ? 'Saving…' : 'Save Policy'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
