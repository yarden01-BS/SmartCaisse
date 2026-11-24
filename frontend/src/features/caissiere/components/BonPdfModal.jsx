import { Printer, Receipt, X } from 'lucide-react';
import { imprimerBonPdf } from '../utils';

export default function BonPdfModal({ bon, caissiereNom, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">Reçu PDF — Bon #{bon.numBon}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner font-sans text-xs space-y-3">
          <div className="text-center border-b border-dashed border-slate-400 pb-3">
            <h4 className="font-extrabold text-sm tracking-wide">SMARTCAISSE — SIAT</h4>
            <p className="text-[11px] text-slate-600">Reçu Officiel de Restauration</p>
            <p className="font-bold mt-1">BON DE COMMANDE N° {bon.numBon}</p>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-600">Date & Heure :</span>
            <span className="font-bold">{bon.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Caissière :</span>
            <span className="font-bold">{bon.caissiereNom || caissiereNom}</span>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Bénéficiaire :</span>
              <span className="font-bold">{bon.client.nom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Matricule :</span>
              <span className="font-bold">{bon.client.matricule}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Statut / Service :</span>
              <span className="font-bold">
                {bon.client.statut} ({bon.client.service})
              </span>
            </div>
          </div>

          <div className="border-t-2 border-b-2 border-slate-900 py-2 my-2 flex justify-between font-bold text-sm">
            <span>TOTAL COMMANDE :</span>
            <span>{bon.prixTotal.toLocaleString()} FCFA</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Part Subventionnée (SIAT) :</span>
              <span className="font-bold text-sky-600">{bon.partEntreprise.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Part Payée par le Client :</span>
              <span className="font-bold text-amber-600">{bon.partClient.toLocaleString()} FCFA</span>
            </div>
          </div>

          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-center font-bold rounded-lg text-[10px]">
            ✔ SIGNÉ PAR RECONNAISSANCE FACIALE
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => imprimerBonPdf(bon)}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Enregistrer / Imprimer en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
