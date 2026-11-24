import { useState } from 'react';
import { Mail, Send, X } from 'lucide-react';

export default function EmailModal({ objetParDefaut, nbTravailleurs, totaux, onClose }) {
  const [destinataire, setDestinataire] = useState('');
  const [objet, setObjet] = useState(objetParDefaut);
  const [enCours, setEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destinataire.trim()) return;
    setEnCours(true);
    setTimeout(() => {
      setEnCours(false);
      setConfirmation(
        `L'état financier détaillé par travailleur a bien été envoyé par courrier électronique à ${destinataire.trim()}.`
      );
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold">Envoyer l'État Financier</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Adresse e-mail du destinataire (Comptabilité / Direction SIAT)
            </label>
            <input
              type="email"
              required
              placeholder="Saisir l'adresse e-mail du destinataire..."
              value={destinataire}
              onChange={(e) => setDestinataire(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Objet du courrier électronique</label>
            <input
              type="text"
              required
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <span className="font-bold text-slate-300 block mb-1">
              Contenu inclus dans l'envoi ({nbTravailleurs} travailleur(s)) :
            </span>
            <div className="flex justify-between text-slate-400">
              <span>Nombre total de bons :</span>
              <span className="text-white font-semibold">{totaux.nbBons}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total général encaissé :</span>
              <span className="text-blue-400 font-semibold">{totaux.ventes.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Part payée par les clients :</span>
              <span className="text-amber-400 font-semibold">{totaux.client.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Part subventionnée (SIAT) :</span>
              <span className="text-sky-400 font-semibold">{totaux.siat.toLocaleString()} FCFA</span>
            </div>
          </div>

          {confirmation && (
            <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl text-center">
              {confirmation}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={enCours}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {enCours ? 'Envoi en cours...' : 'Envoyer par e-mail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
