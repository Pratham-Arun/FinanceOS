import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { Sliders, Save, CheckCircle2, ShieldAlert, Utensils, Plane, Home, Package, HelpCircle } from 'lucide-react';

const CATEGORY_ICONS = {
  Meals: <Utensils size={18} style={{ color: 'var(--amber-400)' }} />,
  Travel: <Plane size={18} style={{ color: 'var(--indigo-400)' }} />,
  Accommodation: <Home size={18} style={{ color: 'var(--violet-400)' }} />,
  Supplies: <Package size={18} style={{ color: 'var(--emerald-400)' }} />,
  Other: <HelpCircle size={18} style={{ color: 'var(--blue-400)' }} />,
};

export default function PolicyManager() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/admin/policies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data || []);
      }
    } catch (err) {
      console.error('Fetch policies error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (policy) => {
    setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/admin/policies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: policy.category,
          max_limit: parseFloat(policy.max_limit),
          receipt_required: policy.receipt_required,
          duplicate_window_days: parseInt(policy.duplicate_window_days || 30)
        })
      });
      if (res.ok) {
        setMsg(`Policy configuration for '${policy.category}' saved successfully.`);
        fetchPolicies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 300 }} />
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="Rule Engine & Policy Limits"
        subtitle="Set category reimbursement caps, mandatory receipt thresholds, and duplicate detection windows."
        icon={<Sliders size={20} />}
      />

      {msg && (
        <div className="alert alert-success animate-fade-in">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{msg}</span>
        </div>
      )}

      {/* Policy Category Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-5)' }}>
        {policies.map((p) => {
          const icon = CATEGORY_ICONS[p.category] || CATEGORY_ICONS.Other;

          return (
            <div key={p.category} className="card-policy" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 'var(--sp-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-overlay)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.category}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Category Policy</div>
                  </div>
                </div>
                <span className="badge badge-slate">v2026</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="field-label" htmlFor={`cap-${p.category}`}>Max Limit Cap ($)</label>
                  <input
                    id={`cap-${p.category}`}
                    type="number"
                    value={p.max_limit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPolicies(policies.map(pol => pol.category === p.category ? { ...pol, max_limit: val } : pol));
                    }}
                    className="field-input text-mono"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--sp-3) var(--sp-4)',
                  background: 'var(--surface-inset)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Mandatory Receipt</span>
                  <input
                    type="checkbox"
                    checked={p.receipt_required}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPolicies(policies.map(pol => pol.category === p.category ? { ...pol, receipt_required: checked } : pol));
                    }}
                    style={{ width: 16, height: 16, accentColor: 'var(--indigo-500)', cursor: 'pointer' }}
                  />
                </div>

                <div className="form-group">
                  <label className="field-label" htmlFor={`dup-${p.category}`}>Duplicate Window (Days)</label>
                  <input
                    id={`dup-${p.category}`}
                    type="number"
                    value={p.duplicate_window_days || 30}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPolicies(policies.map(pol => pol.category === p.category ? { ...pol, duplicate_window_days: val } : pol));
                    }}
                    className="field-input"
                  />
                </div>
              </div>

              <button
                onClick={() => handleUpdate(p)}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                <Save size={13} /> Save {p.category} Policy
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
