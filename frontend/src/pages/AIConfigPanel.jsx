import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionHeader } from '../components/ui/PageHeader';
import { Cpu, Sliders, Eye, CheckCircle2, Upload, Save, Sparkles, AlertCircle } from 'lucide-react';

const PROVIDERS = {
  llm: [
    { value: 'openai', label: 'GPT-5.5 (OpenAI)', icon: '🤖', desc: 'High accuracy reasoning engine' },
    { value: 'gemini', label: 'Gemini 2.5 Pro (Google)', icon: '✨', desc: 'Fast multimodal document understanding' },
    { value: 'claude', label: 'Claude Sonnet 4 (Anthropic)', icon: '🧠', desc: 'Nuanced policy compliance analysis' },
  ],
  ocr: [
    { value: 'tesseract', label: 'Tesseract OCR Engine', icon: '📄', desc: 'Offline open-source fallback engine' },
    { value: 'google', label: 'Google Document AI', icon: '☁️', desc: 'Cloud document parsing API' },
    { value: 'azure', label: 'Azure Document Intelligence', icon: '🔷', desc: 'Enterprise layout analysis' },
  ]
};

export default function AIConfigPanel() {
  const [config, setConfig] = useState({
    llm_provider: 'openai',
    ocr_provider: 'tesseract',
    temperature: 0.2,
    max_tokens: 1024,
    risk_threshold_auto_approve: 0.95,
    risk_threshold_review: 0.80
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setConfig(await res.json());
    } catch (err) {
      console.error('Fetch AI Config error:', err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMsg('AI configuration updated successfully and applied to runtime pipeline.');
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="AI Operations & Engine Settings"
        subtitle="Configure LLM providers, OCR document extraction engines, model parameters, and risk confidence thresholds."
        icon={<Cpu size={20} />}
        actions={
          <button onClick={handleSave} disabled={loading} className="btn btn-ai btn-md">
            <Save size={15} />
            {loading ? 'Saving Parameters…' : 'Apply AI Config'}
          </button>
        }
      />

      {msg && (
        <div className="alert alert-success animate-fade-in">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{msg}</span>
        </div>
      )}

      {/* Grid Settings Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>

        {/* LLM Provider Selection */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Cpu size={16} style={{ color: 'var(--violet-400)' }} /> LLM Provider Engine
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
            {PROVIDERS.llm.map(p => {
              const isSelected = config.llm_provider === p.value;
              return (
                <div
                  key={p.value}
                  className={`provider-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setConfig(c => ({ ...c, llm_provider: p.value }))}
                >
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--indigo-400)' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* OCR Engine Selection */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Upload size={16} style={{ color: 'var(--emerald-400)' }} /> OCR Document Parsing Engine
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
            {PROVIDERS.ocr.map(p => {
              const isSelected = config.ocr_provider === p.value;
              return (
                <div
                  key={p.value}
                  className={`provider-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setConfig(c => ({ ...c, ocr_provider: p.value }))}
                >
                  <span style={{ fontSize: 20 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--emerald-400)' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Tuning Controls */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Sliders size={16} style={{ color: 'var(--amber-400)' }} /> Model Hyperparameters
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', marginTop: 'var(--sp-3)' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Temperature</label>
                <span className="text-mono" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--indigo-400)' }}>
                  {config.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.temperature}
                onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--indigo-500)', margin: '8px 0 4px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                <span>0.0 (Strict / Deterministic)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="max_tokens">Max Token Allocation</label>
              <input
                id="max_tokens"
                type="number"
                className="field-input"
                value={config.max_tokens}
                onChange={e => setConfig(c => ({ ...c, max_tokens: parseInt(e.target.value) || 512 }))}
              />
            </div>
          </div>
        </div>

        {/* Risk Threshold Sliders */}
        <div className="card" style={{ padding: 'var(--sp-6)' }}>
          <div className="section-header">
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Eye size={16} style={{ color: 'var(--violet-400)' }} /> Confidence & Routing Thresholds
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', marginTop: 'var(--sp-3)' }}>
            <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--emerald-50)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--emerald-400)' }}>Auto-Approve Threshold</span>
                <span className="text-mono" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {Math.round(config.risk_threshold_auto_approve * 100)}%
                </span>
              </div>
              <input
                type="range" min="0.70" max="1.0" step="0.01"
                value={config.risk_threshold_auto_approve}
                onChange={e => setConfig(c => ({ ...c, risk_threshold_auto_approve: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--emerald-500)', margin: '4px 0' }}
              />
            </div>

            <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--amber-50)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--amber-400)' }}>Manager Review Threshold</span>
                <span className="text-mono" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {Math.round(config.risk_threshold_review * 100)}%
                </span>
              </div>
              <input
                type="range" min="0.50" max="0.95" step="0.01"
                value={config.risk_threshold_review}
                onChange={e => setConfig(c => ({ ...c, risk_threshold_review: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--amber-500)', margin: '4px 0' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
