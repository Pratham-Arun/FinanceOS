import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Upload, FileText, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_MB = 5;

const SubmitExpense = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '', category: 'Meals', amount: '', expense_date: '', description: '', receipt_url: ''
  });

  const validateAndUpload = async (f) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Invalid file type. Only JPG, PNG, and PDF files are allowed.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.post('/api/expenses/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { receipt_url, ai_extraction } = res.data;
      setConfidence(ai_extraction.confidence_scores);
      setFormData({
        title: `Expense at ${ai_extraction.vendor}`,
        category: ai_extraction.category || 'Other',
        amount: ai_extraction.amount?.toString() || '',
        expense_date: ai_extraction.expense_date || '',
        description: `Reimbursement claim for ${ai_extraction.vendor} — Invoice #${ai_extraction.invoice_number || 'N/A'}`,
        receipt_url: receipt_url
      });
    } catch (err) {
      setError('OCR scanning failed. Please fill in the details manually.');
    } finally {
      setUploading(false);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title || !formData.amount || !formData.expense_date) {
      setError('Please fill in all required fields before submitting.');
      return;
    }
    try {
      await api.post('/api/expenses', { ...formData, amount: parseFloat(formData.amount), status: 'Submitted' });
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit claim.');
    }
  };

  const handleDraft = async () => {
    setError('');
    if (!formData.title) {
      setError('Enter at least a title to save as draft.');
      return;
    }
    try {
      await api.post('/api/expenses', {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        expense_date: formData.expense_date || new Date().toISOString().split('T')[0],
        status: 'Draft'
      });
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save draft.');
    }
  };

  const confStyle = (s) => {
    if (!s) return {};
    if (s >= 0.9) return { color: 'var(--emerald-400)', background: 'var(--emerald-50)', border: '1px solid rgba(16,185,129,0.2)' };
    if (s >= 0.75) return { color: 'var(--amber-400)', background: 'var(--amber-50)', border: '1px solid rgba(245,158,11,0.2)' };
    return { color: 'var(--crimson-400)', background: 'var(--crimson-50)', border: '1px solid rgba(239,68,68,0.2)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Submit Reimbursement Claim
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
          Upload your receipt to auto-extract details via AI OCR, then review and submit.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>

        {/* Left: Upload zone + confidence report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            style={{ minHeight: 220, cursor: 'pointer' }}
            onClick={() => document.getElementById('receipt-input').click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={async e => { e.preventDefault(); setIsDragging(false); await validateAndUpload(e.dataTransfer.files[0]); }}
          >
            <input id="receipt-input" type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={e => validateAndUpload(e.target.files[0])} />

            {uploading ? (
              <>
                <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--indigo-400)' }} />
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>AI OCR Processing…</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>Extracting vendor, amount, date…</div>
              </>
            ) : file ? (
              <>
                <FileText size={36} style={{ color: 'var(--indigo-400)' }} />
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split('/').pop().toUpperCase()} · Click to replace
                </div>
              </>
            ) : (
              <>
                <Upload size={36} style={{ color: isDragging ? 'var(--indigo-400)' : 'var(--text-tertiary)' }} />
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                  {isDragging ? 'Drop file here' : 'Upload Receipt'}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                  Drag & drop or click to browse
                </div>
                <span className="badge badge-slate" style={{ marginTop: 4 }}>
                  JPG · PNG · PDF · Max 5 MB
                </span>
              </>
            )}
          </div>

          {confidence && (
            <div className="ai-panel">
              <div className="ai-panel-header">
                <CheckCircle2 size={15} style={{ color: 'var(--emerald-400)' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>AI Extraction Confidence</span>
              </div>
              <div className="ai-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(confidence).map(([key, score]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key}:</span>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontFamily: 'var(--font-mono)', ...confStyle(score) }}>
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--sp-5)' }}>Claim Details</div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="field-label" htmlFor="title">Expense Title *</label>
              <input id="title" name="title" type="text" required className="field-input"
                placeholder="e.g. Client dinner at Marriott" value={formData.title} onChange={handleInput} />
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="field-label" htmlFor="category">Category</label>
                <select id="category" name="category" className="field-input" value={formData.category} onChange={handleInput}>
                  <option value="Meals">Meals</option>
                  <option value="Travel">Travel</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="field-label" htmlFor="amount">Amount ($) *</label>
                <input id="amount" name="amount" type="number" step="0.01" required className="field-input"
                  placeholder="0.00" value={formData.amount} onChange={handleInput} />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="expense_date">Expense Date *</label>
              <input id="expense_date" name="expense_date" type="date" required className="field-input"
                value={formData.expense_date} onChange={handleInput} />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={3} className="field-input"
                placeholder="Include project name, client, or purpose…"
                value={formData.description} onChange={handleInput}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
              <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>
                Submit Claim
              </button>
              <button type="button" onClick={handleDraft} className="btn btn-secondary btn-md" style={{ flex: 1 }}>
                Save as Draft
              </button>
              <button type="button" onClick={() => navigate('/expenses')} className="btn btn-ghost btn-md">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitExpense;
