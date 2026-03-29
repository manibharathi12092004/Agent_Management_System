import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-500" strokeWidth={2} />,
  error:   <XCircle    size={16} className="text-red-500"     strokeWidth={2} />,
  info:    <AlertCircle size={16} className="text-indigo-500" strokeWidth={2} />,
};

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl shadow-floating animate-fade-in min-w-[280px] max-w-sm">
      {ICONS[type]}
      <span className="text-sm text-gray-800 flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

// Simple toast container — place once in App.jsx
let _addToast = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
  };

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.msg} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

export const toast = {
  success: (msg) => _addToast?.(msg, 'success'),
  error:   (msg) => _addToast?.(msg, 'error'),
  info:    (msg) => _addToast?.(msg, 'info'),
};
