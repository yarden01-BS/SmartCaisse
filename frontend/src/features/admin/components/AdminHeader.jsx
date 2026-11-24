import { LogOut } from 'lucide-react';

export default function AdminHeader({ adminUser, onLogout }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-emerald-400">SmartCaisse Admin</span>
        <span className="text-slate-600">|</span>
        <span className="text-sm text-slate-300">
          Session : <strong className="text-white">{adminUser.email}</strong>
        </span>
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer text-white"
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </button>
    </header>
  );
}
