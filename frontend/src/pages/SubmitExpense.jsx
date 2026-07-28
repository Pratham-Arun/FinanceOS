import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Upload, FileText, CheckCircle2, RefreshCw, AlertCircle, Sparkles,
  ArrowLeft, ArrowRight, ShieldCheck, Check
} from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_MB = 5;

const SubmitExpense = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Meals',
    amount: '',
    expense_date: '',
    description: '',
    receipt_url: ''
  });
  const [error, setError] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [step, setStep] = useState(1);

  const validateAndUploadFile = async (selectedFile) => {
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Invalid file type. Only JPG, PNG, and PDF files are allowed.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setError('');

    const uploadData = new FormData();
    uploadData.append('file', selectedFile);

    try {
      const response = await api.post('/api/expenses/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { receipt_url, ai_extraction } = response.data;

      setExtractedData(ai_extraction);
      setConfidence(ai_extraction.confidence_scores);
      setFormData({
        title: `Expense at ${ai_extraction.vendor}`,
        category: ai_extraction.category || 'Meals',
        amount: ai_extraction.amount ? ai_extraction.amount.toString() : '',
        expense_date: ai_extraction.expense_date || new Date().toISOString().split('T')[0],
        description: `Reimbursement claim for ${ai_extraction.vendor} (Invoice #${ai_extraction.invoice_number || 'N/A'})`,
        receipt_url: receipt_url
      });
      setStep(2);
    } catch (err) {
      console.error(err);
      setError('AI document scanning encountered an issue. Please manually complete the fields below.');
      setStep(2);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    await validateAndUploadFile(selectedFile);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.amount || !formData.expense_date) {
      setError('Please complete all mandatory fields (*).');
      return;
    }

    try {
      await api.post('/api/expenses', {
        title: formData.title,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        description: formData.description,
        receipt_url: formData.receipt_url,
        status: 'Submitted'
      });
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit reimbursement claim.');
    }
  };

  const handleSaveDraft = async () => {
    setError('');
    if (!formData.title) {
      setError('Enter at least a claim title to save draft.');
      return;
    }

    try {
      await api.post('/api/expenses', {
        title: formData.title,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        expense_date: formData.expense_date || new Date().toISOString().split('T')[0],
        description: formData.description,
        receipt_url: formData.receipt_url,
        status: 'Draft'
      });
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save draft.');
    }
  };

  const formatConfidence = (score) => {
    if (!score) return '0%';
    return `${(score * 100).toFixed(0)}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="Submit Expense Claim"
        subtitle="Upload your receipt or invoice to let FinanceOS AI automatically extract amounts, vendors, and dates."
        icon={<Upload size={20} />}
        actions={
          <button onClick={() => navigate('/expenses')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      {/* Workflow Stepper */}
      <div className="card" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        padding: 'var(--sp-3) var(--sp-5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', opacity: step >= 1 ? 1 : 0.4 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: step === 1 ? 'var(--indigo-500)' : step > 1 ? 'var(--emerald-500)' : 'var(--border-default)',
            color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {step > 1 ? <Check size={12} /> : '1'}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Upload Document</span>
        </div>

        <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', opacity: step >= 2 ? 1 : 0.4 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: step === 2 ? 'var(--indigo-500)' : 'var(--border-default)',
            color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            2
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Verify & Submit</span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>

        {/* Left Column: Upload Zone & AI Confidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onClick={() => document.getElementById('receipt-input').click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) {
                await validateAndUploadFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              id="receipt-input"
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--indigo-400)' }} />
                <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>
                  Analyzing Document with OCR…
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  Extracting line items, vendor name, dates, and total amount
                </div>
              </div>
            ) : file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div style={{
                  padding: 'var(--sp-3)', borderRadius: '50%', background: 'var(--indigo-100)', color: 'var(--indigo-400)'
                }}>
                  <FileText size={24} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>{file.name}</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type.split('/')[1]?.toUpperCase()}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={(e) => { e.stopPropagation(); document.getElementById('receipt-input').click(); }}
                >
                  Replace File
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div style={{
                  padding: 'var(--sp-3)', borderRadius: '50%', background: 'var(--surface-overlay)', color: 'var(--text-tertiary)'
                }}>
                  <Upload size={24} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>
                  {isDragging ? 'Drop receipt file here' : 'Upload Receipt or Invoice'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: 280, lineHeight: 1.5 }}>
                  Drag and drop PNG, JPG, or PDF (max 5 MB). Or click to browse.
                </div>
              </div>
            )}
          </div>

          {/* AI Extraction Confidence */}
          {confidence && (
            <div className="card-ai" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <Sparkles size={15} style={{ color: 'var(--violet-400)' }} />
                <span className="card-title" style={{ fontSize: 'var(--text-sm)', color: 'var(--violet-400)' }}>
                  AI Extraction Confidence
                </span>
                <span className="badge badge-violet" style={{ marginLeft: 'auto' }}>OCR Verified</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Vendor Name</span>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--emerald-400)' }}>{formatConfidence(confidence.vendor)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: formatConfidence(confidence.vendor), background: 'var(--emerald-500)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Transaction Amount</span>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--emerald-400)' }}>{formatConfidence(confidence.amount)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: formatConfidence(confidence.amount), background: 'var(--emerald-500)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Transaction Date</span>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--emerald-400)' }}>{formatConfidence(confidence.date)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: formatConfidence(confidence.date), background: 'var(--emerald-500)' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Form Details */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-header">
            <div className="section-title">Claim Parameters</div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--text-sm)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="field-label" htmlFor="title">Expense Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                className="field-input"
                placeholder="e.g. Client Lunch at Bistro"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="field-label" htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  className="filter-select"
                  style={{ width: '100%', height: 38 }}
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="Meals">Meals</option>
                  <option value="Travel">Travel</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="amount">Amount ($) *</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  className="field-input text-mono"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="expense_date">Expense Date *</label>
              <input
                id="expense_date"
                name="expense_date"
                type="date"
                required
                className="field-input"
                value={formData.expense_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="description">Notes / Description</label>
              <textarea
                id="description"
                name="description"
                rows="3"
                className="field-input"
                placeholder="Provide details or business context…"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            {/* AI Policy Pre-Check Banner */}
            {formData.amount > 0 && (
              <div className="alert alert-ai">
                <Sparkles size={15} style={{ flexShrink: 0, color: 'var(--violet-400)' }} />
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  <strong>FinanceOS AI Policy Pre-Check:</strong>
                  {parseFloat(formData.amount) > 50 && formData.category === 'Meals' && (
                    <div style={{ color: 'var(--amber-400)', marginTop: 2 }}>⚠️ Meal claims above $50 require itemized receipt verification.</div>
                  )}
                  {parseFloat(formData.amount) > 250 && formData.category === 'Accommodation' && (
                    <div style={{ color: 'var(--crimson-400)', marginTop: 2 }}>⚠️ Hotel claims above $250 exceed standard cap limit.</div>
                  )}
                  {parseFloat(formData.amount) <= 50 && (
                    <div style={{ color: 'var(--emerald-400)', marginTop: 2 }}>✓ Claim amount complies with baseline policy limits.</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
              <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>
                Submit Claim
              </button>
              <button type="button" onClick={handleSaveDraft} className="btn btn-secondary btn-md">
                Save Draft
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitExpense;
