import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { ShieldCheck, ShieldAlert, Check } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [receiptRequired, setReceiptRequired] = useState(true);
  const [duplicateDays, setDuplicateDays] = useState(30);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPolicies = async () => {
    try {
      const response = await api.get('/api/admin/policies');
      setPolicies(response.data || []);
      if (response.data && response.data.length > 0) {
        loadPolicyDetails(response.data[0].category, response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchPolicies();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPolicyDetails = (category, policyList = policies) => {
    const policy = policyList.find(p => p.category === category);
    if (policy) {
      setSelectedCategory(policy.category);
      setMaxLimit(policy.max_limit.toString());
      setReceiptRequired(policy.receipt_required);
      setDuplicateDays(policy.duplicate_window_days);
    }
  };

  const handlePolicyUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setSuccessMsg('');

    try {
      await api.put('/api/admin/policies', {
        category: selectedCategory,
        max_limit: parseFloat(maxLimit),
        receipt_required: receiptRequired,
        duplicate_window_days: duplicateDays
      });
      setSuccessMsg(`Policy for "${selectedCategory}" updated successfully.`);
      await fetchPolicies();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <ShieldAlert size={36} style={{ color: 'var(--crimson-400)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 500, marginBottom: '6px' }}>Access Denied</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Only System Administrators can configure global company expense policies.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '32px', width: '200px' }} className="skeleton" />
        <div style={{ height: '300px' }} className="skeleton" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1000px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Expense Policy Configuration</h2>
          <p className="page-subtitle">
            Configure category spend limits, receipt mandates, and duplicate detection windows for automated compliance.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Active Policies Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="section-title">Active Category Policies</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="col-right">Max Limit</th>
                <th>Receipt Required</th>
                <th className="col-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.category} style={{ background: selectedCategory === p.category ? 'var(--indigo-50)' : 'transparent' }}>
                  <td style={{ fontWeight: 500 }}>{p.category}</td>
                  <td className="col-mono col-right" style={{ fontWeight: 500 }}>${p.max_limit.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${p.receipt_required ? 'badge-emerald' : 'badge-slate'}`}>
                      {p.receipt_required ? 'Mandatory' : 'Optional'}
                    </span>
                  </td>
                  <td className="col-right">
                    <button
                      onClick={() => loadPolicyDetails(p.category)}
                      className="btn btn-secondary btn-xs"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Update Form */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--indigo-400)' }} />
            <h3 className="section-title">Edit Policy Rule</h3>
          </div>

          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              <Check size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-xs)' }}>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePolicyUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="field-label">Category</label>
              <input
                type="text"
                disabled
                className="field-input"
                value={selectedCategory}
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="maxLimit">Maximum Amount Limit ($)</label>
              <input
                id="maxLimit"
                type="number"
                step="0.01"
                required
                className="field-input text-mono"
                value={maxLimit}
                onChange={(e) => setMaxLimit(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="duplicateDays">Duplicate Detection Window (Days)</label>
              <input
                id="duplicateDays"
                type="number"
                required
                className="field-input text-mono"
                value={duplicateDays}
                onChange={(e) => setDuplicateDays(parseInt(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                id="receiptRequired"
                type="checkbox"
                checked={receiptRequired}
                onChange={(e) => setReceiptRequired(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--indigo-500)', cursor: 'pointer' }}
              />
              <label htmlFor="receiptRequired" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                Require mandatory receipt attachment
              </label>
            </div>

            <button type="submit" disabled={updating} className="btn btn-primary btn-md" style={{ width: '100%', marginTop: '8px' }}>
              {updating ? 'Saving Rule…' : 'Save Policy Parameters'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
