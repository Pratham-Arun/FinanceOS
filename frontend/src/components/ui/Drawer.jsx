import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Drawer — Slide-in right-side panel
 * Props:
 *   open     - boolean
 *   onClose  - function
 *   title    - string
 *   subtitle - string (optional)
 *   size     - 'default' | 'lg'
 *   footer   - ReactNode
 *   children - content
 */
export function Drawer({ open, onClose, title, subtitle, size = 'default', footer, children }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div ref={drawerRef} className={`drawer ${size === 'lg' ? 'drawer-lg' : ''}`}>
        <div className="drawer-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-title" style={{ fontSize: 'var(--text-lg)' }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ flexShrink: 0 }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {children}
        </div>

        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * ConfirmDialog — Modal confirmation
 * Props:
 *   open         - boolean
 *   onClose      - function
 *   onConfirm    - function
 *   title        - string
 *   description  - string
 *   confirmLabel - string (default "Confirm")
 *   danger       - boolean (red confirm button)
 *   loading      - boolean
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger = false, loading = false }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="card-title">{title}</div>
          </div>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn btn-md ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Drawer;
