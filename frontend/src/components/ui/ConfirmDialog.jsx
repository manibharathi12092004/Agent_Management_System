import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 animate-fade-in" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm animate-fade-in">
        <div className="card p-6 shadow-floating">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg flex-shrink-0 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-amber-500'} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button onClick={onCancel} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
