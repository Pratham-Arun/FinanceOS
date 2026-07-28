import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Drawer } from '../components/ui/Drawer';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { EmptyState, LoadingSkeleton } from '../components/ui/EmptyState';
import { BookOpen, Search, Upload, Plus, FileText, CheckCircle2, Database, Tag } from 'lucide-react';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Travel');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchKnowledgeDocs();
  }, []);

  const fetchKnowledgeDocs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/search?q=Policy', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocs(data || []);
      }
    } catch (err) {
      console.error('Fetch knowledge error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/knowledge/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error('Vector DB search error:', err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, category, content })
      });
      if (res.ok) {
        setMsg(`Policy clause '${title}' indexed into RAG vector memory successfully.`);
        setShowUploadDrawer(false);
        setTitle('');
        setContent('');
        fetchKnowledgeDocs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayList = searchResults.length > 0 ? searchResults : docs;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
        <div className="skeleton" style={{ height: 40, width: 300 }} />
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} className="animate-fade-up">

      {/* Page Header */}
      <PageHeader
        title="Policy Library & RAG Ground Truth"
        subtitle="Manage corporate handbooks, travel rules, and AI ground truth documents for vector semantic search."
        icon={<BookOpen size={20} />}
        actions={
          <button onClick={() => setShowUploadDrawer(true)} className="btn btn-primary btn-md">
            <Plus size={15} strokeWidth={2.5} /> Index Policy Document
          </button>
        }
      />

      {msg && (
        <div className="alert alert-success animate-fade-in">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{msg}</span>
        </div>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <div className="search-field" style={{ flex: 1 }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="field-input"
            style={{ height: 40, fontSize: 'var(--text-sm)', paddingLeft: 36 }}
            placeholder="Semantic search policy clauses (e.g. hotel limit cap, meal allowance, alcohol rule)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary btn-md">
          Search Vector DB
        </button>
      </form>

      {/* Documents Grid */}
      {displayList.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="No policy documents indexed"
          subtitle="Index policy documents into the RAG vector store to provide grounding for AI compliance checks."
          action={
            <button onClick={() => setShowUploadDrawer(true)} className="btn btn-primary btn-sm">
              Index First Document
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-5)' }}>
          {displayList.map((doc, idx) => (
            <div key={idx} className="card" style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-indigo">
                  <Tag size={11} /> {doc.category}
                </span>
                <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
              </div>

              <div className="card-title" style={{ fontSize: 'var(--text-md)' }}>{doc.title}</div>

              <div style={{
                padding: 'var(--sp-4)',
                background: 'var(--surface-inset)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                {doc.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Index Drawer */}
      <Drawer
        open={showUploadDrawer}
        onClose={() => setShowUploadDrawer(false)}
        title="Index Policy Document into RAG"
        subtitle="Add a new policy clause or document for vector semantic embedding and AI compliance checking."
      >
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="field-label" htmlFor="doc_title">Document / Clause Title</label>
            <input
              id="doc_title"
              type="text"
              required
              className="field-input"
              placeholder="e.g. Executive Travel Policy Section 4.2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="doc_cat">Policy Category</label>
            <select
              id="doc_cat"
              className="filter-select"
              style={{ width: '100%' }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Supplies">Supplies</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="doc_content">Policy Clause Text</label>
            <textarea
              id="doc_content"
              required
              rows={6}
              className="field-input"
              placeholder="Paste exact policy text or clause snippet here…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
            <button
              type="button"
              onClick={() => setShowUploadDrawer(false)}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-md"
            >
              {submitting ? 'Indexing…' : 'Index Document'}
            </button>
          </div>
        </form>
      </Drawer>

    </div>
  );
}
