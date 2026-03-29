import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Sheet({ open, onClose, title, subtitle, children, footer, width = 'w-sheet' }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="sheet-overlay" onClick={onClose} />

      {/* Panel */}
      <div className={`sheet-panel ${width}`}>
        {/* Header */}
        <div className="sheet-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="sheet-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="sheet-footer">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
