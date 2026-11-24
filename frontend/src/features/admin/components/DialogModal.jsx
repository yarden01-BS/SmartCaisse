import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function DialogModal({ dialog, onClose }) {
  if (!dialog.ouvert) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            dialog.type === 'succes'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          }`}
        >
          {dialog.type === 'succes' ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>
        <h3 className="text-lg font-bold text-white">{dialog.titre}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{dialog.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm cursor-pointer text-white transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
