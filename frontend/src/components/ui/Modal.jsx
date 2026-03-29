import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
        w-full ${width} max-h-[90vh]
        bg-white rounded-2xl shadow-floating flex flex-col
        animate-fade-in
      `}>
        {/* Header */}
        <div className="flex items-start justify-between px-7 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100 ml-4 flex-shrink-0"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
