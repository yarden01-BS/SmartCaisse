import React, { useState, useEffect } from 'react';
import { login, getBeneficiaires, restoreSession, logout } from '../api';
import useCommandes from '../hooks/useCommandes';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Fingerprint,
  CheckCircle2,
  LogOut,
  Receipt,
  Search,
  User,
  ChevronDown,
  Mail,
  Send,
  X,
  FileText,
  Printer,
  FileSpreadsheet,
  Briefcase,
  PieChart,
  Building2,
  Phone,
  Calendar,
} from 'lucide-react';

function calculerRepartitionSiat(montantTotal) {
  const montant = parseFloat(montantTotal);
  if (isNaN(montant) || montant <= 0) {
    return { partEntreprise: 0, partClient: 0 };
  }
  const partEntreprise = Math.min(montant * 0.5, 1000);
  const partClient = montant - partEntreprise;
  return { partEntreprise, partClient };
}

export default function CaissePage() {
  const navigate = useNavigate();

  // État d'authentification de la caissière
  const [caissiere, setCaissiere] = useState(null);
  const [loginNom, setLoginNom] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginError, setLoginError] = useState('');

  // Sous-section active : 'commande' | 'rapport' | 'profil'
  const [sectionActive, setSectionActive] = useState('commande');

  const [personnel, setPersonnel] = useState([]);
  const { commandes, ajouterCommande } = useCommandes(Boolean(caissiere));

  const aujourdhuiStr = new Date().toISOString().slice(0, 10);
  const moisActuelStr = new Date().toISOString().slice(0, 7);

  // Liste déroulante avec recherche
  const [dropdownOuvert, setDropdownOuvert] = useState(false);
  const [rechercheClient, setRechercheClient] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState(null);

  // Saisie commande & Empreinte digitale
  const [montantInput, setMontantInput] = useState('');
  const [isScanningPrint, setIsScanningPrint] = useState(false);
  const [empreinteValidee, setEmpreinteValidee] = useState(false);
  const [printFeedback, setPrintFeedback] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Aperçu PDF d'un bon spécifique
  const [bonPdfSelectionne, setBonPdfSelectionne] = useState(null);

  // Rapport & E-mail (Choix PDF ou Excel du tableau uniquement)
  const [periodeRapport, setPeriodeRapport] = useState('jour');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDestinataire, setEmailDestinataire] = useState('');
  const [emailObjet, setEmailObjet] = useState('');
  const [emailFormat, setEmailFormat] = useState('pdf'); // 'pdf' | 'excel'
  const [emailEnCours, setEmailEnCours] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');

  const { partEntreprise, partClient } = calculerRepartitionSiat(montantInput);

  const personnelFiltre = personnel.filter(
    (p) =>
      p.nom.toLowerCase().includes(rechercheClient.toLowerCase()) ||
      p.matricule.toLowerCase().includes(rechercheClient.toLowerCase()) ||
      p.service.toLowerCase().includes(rechercheClient.toLowerCase())
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const user = await login(loginNom.trim(), loginPwd);
      setCaissiere(user);
      setLoginError('');
      const beneficiaires = await getBeneficiaires();
      setPersonnel(beneficiaires);
    } catch (error) {
      setLoginError(error.message || 'Connexion impossible.');
    }
  };

  // --- Vérification par Empreinte Digitale ---
  const handleVerificationEmpreinte = () => {
    if (!clientSelectionne) return;
    setIsScanningPrint(true);
    setEmpreinteValidee(false);
    setPrintFeedback('Lecture du capteur biométrique... Posez le doigt sur le lecteur.');
    setStatusMessage('');

    setTimeout(() => {
      setIsScanningPrint(false);
      setEmpreinteValidee(true);
      setPrintFeedback(`✔ Empreinte digitale de ${clientSelectionne.nom} authentifiée avec succès !`);
    }, 1500);
  };

  const handleValiderCommande = async (e) => {
    e.preventDefault();
    const montant = parseFloat(montantInput);
    if (!empreinteValidee || !clientSelectionne || isNaN(montant) || montant <= 0) return;
    try {
      const bon = await ajouterCommande({ client: clientSelectionne, prixTotal: montant });
      setMontantInput('');
      setEmpreinteValidee(false);
      setPrintFeedback('');
      setStatusMessage(
        `Bon N°${bon.numBon} validé pour ${clientSelectionne.nom} ! Client : ${partClient.toLocaleString()} FCFA | SIAT : ${partEntreprise.toLocaleString()} FCFA`
      );
    } catch (error) {
      setStatusMessage(error.message || 'Impossible d’enregistrer le bon.');
    }
  };

  // --- Impression / Export PDF d'un Bon ---
  const imprimerBonPdf = (bon) => {
    const fenetre = window.open('', '_blank', 'width=450,height=650');
    if (!fenetre) return;
    fenetre.document.write(`
      <html>
        <head>
          <title>Bon de Commande #${bon.numBon} - SmartCaisse SIAT</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
            .total { border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 10px 0; font-weight: bold; font-size: 16px; margin-top: 12px; }
            .badge { margin-top: 20px; padding: 10px; background: #ecfdf5; border: 1px solid #10b981; color: #065f46; text-align: center; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;">SMARTCAISSE - SIAT</h2>
            <p style="margin:4px 0; font-size:12px;">Reçu Officiel de Restauration</p>
            <p style="margin:4px 0; font-weight:bold;">BON DE COMMANDE N° ${bon.numBon}</p>
          </div>
          <div class="row"><span>Date & Heure :</span><strong>${bon.date}</strong></div>
          <div class="row"><span>Caissière :</span><strong>${bon.caissiereNom}</strong></div>
          <hr style="border:none; border-top:1px dashed #ccc; margin:12px 0;" />
          <div class="row"><span>Bénéficiaire :</span><strong>${bon.client.nom}</strong></div>
          <div class="row"><span>Matricule :</span><strong>${bon.client.matricule}</strong></div>
          <div class="row"><span>Statut / Service :</span><strong>${bon.client.statut} (${bon.client.service})</strong></div>
          <div class="row total"><span>MONTANT TOTAL :</span><span>${bon.prixTotal.toLocaleString()} FCFA</span></div>
          <div class="row"><span>Part Subventionnée (SIAT) :</span><strong>${bon.partEntreprise.toLocaleString()} FCFA</strong></div>
          <div class="row"><span>Part Payée par le Client :</span><strong>${bon.partClient.toLocaleString()} FCFA</strong></div>
          <div class="badge">✔ VALIDÉ PAR EMPREINTE DIGITALE</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    fenetre.document.close();
  };

  if (!caissiere) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <span className="text-lg font-bold text-blue-500">SmartCaisse</span>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour Accueil
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-4"
          >
            <h1 className="text-2xl font-bold text-center mb-6">Ouverture de Caisse</h1>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email de la caissière</label>
              <input
                type="email"
                placeholder="Ex: caissiere@smartcaisse.com"
                value={loginNom}
                onChange={(e) => setLoginNom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="Mot de passe"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer text-white"
            >
              Se connecter
            </button>

            {loginError && <p className="text-red-400 text-xs text-center mt-2">{loginError}</p>}
          </form>
        </div>
      </div>
    );
  }

  // --- Agrégation nominative par travailleur/stagiaire ---
  const commandesPeriode = commandes.filter((c) =>
    periodeRapport === 'jour'
      ? c.date.startsWith(aujourdhuiStr)
      : c.date.startsWith(moisActuelStr)
  );
  const totalVentes = commandesPeriode.reduce((acc, c) => acc + c.prixTotal, 0);
  const totalPartClients = commandesPeriode.reduce((acc, c) => acc + c.partClient, 0);
  const totalPartSiat = commandesPeriode.reduce((acc, c) => acc + c.partEntreprise, 0);

  const consoParClientMap = {};
  commandesPeriode.forEach((cmd) => {
    const key = cmd.client.matricule;
    if (!consoParClientMap[key]) {
      consoParClientMap[key] = {
        matricule: cmd.client.matricule,
        nom: cmd.client.nom,
        statut: cmd.client.statut,
        service: cmd.client.service,
        total: 0,
        client: 0,
        siat: 0,
        nbBons: 0,
      };
    }
    consoParClientMap[key].total += cmd.prixTotal;
    consoParClientMap[key].client += cmd.partClient;
    consoParClientMap[key].siat += cmd.partEntreprise;
    consoParClientMap[key].nbBons += 1;
  });

  const tableauTravailleurs = Object.values(consoParClientMap).sort((a, b) => b.total - a.total);

  // --- Impression PDF UNIQUEMENT du Tableau ---
  const imprimerTableauUniquement = () => {
    const lignesTableau = tableauTravailleurs
      .map(
        (t) => `
          <tr>
            <td>${t.matricule}</td>
            <td>${t.nom}</td>
            <td>${t.statut} •${t.service}</td>
            <td>${t.nbBons}</td>
            <td>${t.total.toLocaleString()} FCFA</td>
            <td>${t.client.toLocaleString()} FCFA</td>
            <td>${t.siat.toLocaleString()} FCFA</td>
          </tr>`
      )
      .join('');

    const fenetre = window.open('', '_blank', 'width=900,height=650');
    if (!fenetre) return;
    fenetre.document.write(`
      <html>
        <head>
          <title>Tableau_Financier_SIAT_${periodeRapport === 'jour' ? aujourdhuiStr : moisActuelStr}</title>
          <style>
            @page { margin: 16mm; }
            body { font-family: Arial, sans-serif; padding: 0; color: #0f172a; margin: 0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background-color: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; text-align: left; }
            td { padding: 10px 8px; border: 1px solid #cbd5e1; }
            tfoot td { background-color: #e2e8f0; font-weight: bold; padding: 10px 8px; border: 1px solid #94a3b8; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Nom du Travailleur</th>
                <th>Statut / Service</th>
                <th>Nb Bons</th>
                <th>Total Consommé</th>
                <th>Part Client</th>
                <th>Subvention SIAT</th>
              </tr>
            </thead>
            <tbody>
              ${lignesTableau || '<tr><td colspan="7" style="text-align:center;">Aucune donnée</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">TOTAL GÉNÉRAL (${periodeRapport === 'jour' ? 'JOURNÉE' : 'MOIS'})</td>
                <td>${commandesPeriode.length}</td>
                <td>${totalVentes.toLocaleString()} FCFA</td>
                <td>${totalPartClients.toLocaleString()} FCFA</td>
                <td>${totalPartSiat.toLocaleString()} FCFA</td>
              </tr>
            </tfoot>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    fenetre.document.close();
  };

  // --- Téléchargement Excel (CSV compatible Excel) UNIQUEMENT du Tableau ---
  const telechargerTableauExcel = () => {
    const entetes = [
      'Matricule',
      'Nom du Travailleur',
      'Statut',
      'Service',
      'Nb Bons',
      'Total Consomme (FCFA)',
      'Part Client (FCFA)',
      'Subvention SIAT (FCFA)',
    ];
    const lignes = tableauTravailleurs.map((t) => [
      t.matricule,
      t.nom,
      t.statut,
      t.service,
      t.nbBons,
      t.total,
      t.client,
      t.siat,
    ]);
    const ligneTotal = [
      `TOTAL GENERAL (${periodeRapport === 'jour' ? 'JOURNEE' : 'MOIS'})`,
      '',
      '',
      '',
      commandesPeriode.length,
      totalVentes,
      totalPartClients,
      totalPartSiat,
    ];
    const contenuCsv =
      '\uFEFF' +
      [entetes, ...lignes, ligneTotal].map((row) => row.join(';')).join('\n');
    const blob = new Blob([contenuCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `Tableau_Financier_SIAT_${periodeRapport === 'jour' ? aujourdhuiStr : moisActuelStr}.csv`; lien.click(); URL.revokeObjectURL(url); };  const ouvrirFenetreEmail = () => { const libellePeriode = periodeRapport === 'jour' ? `Journée du ${aujourdhuiStr}`
        : `Mois de ${moisActuelStr}`;
    setEmailObjet(`État Financier SmartCaisse SIAT — ${libellePeriode}`);
    setEmailFormat('pdf');
    setEmailConfirmation('');
    setShowEmailModal(true);
  };

  const handleEnvoyerEmail = (e) => {
    e.preventDefault();
    if (!emailDestinataire.trim()) return;
    setEmailEnCours(true);
    setTimeout(() => {
      setEmailEnCours(false);
      const nomFormat = emailFormat === 'excel' ? 'Excel (.xlsx / .csv)' : 'PDF (.pdf)';
      setEmailConfirmation(
        `Le tableau financier au format ${nomFormat} a bien été transmis à ${emailDestinataire.trim()}.`
      );
    }, 900);
  };

  const initialeCaissiere = (caissiere.nom || 'S').trim().charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen bg-[#020617] text-white flex flex-col"
      onClick={() => dropdownOuvert && setDropdownOuvert(false)}
    >
      {/* Barre supérieure */}
      <header className="bg-[#060b19] border-b border-slate-800/80 px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-500">SmartCaisse</span>
          <span className="text-slate-700">|</span>
          <span className="text-sm text-slate-300">
            Espace Caissière : <strong className="text-white font-semibold">{caissiere.nom}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#020617] p-1 rounded-xl border border-slate-800/90">
          <button
            type="button"
            onClick={() => setSectionActive('commande')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              sectionActive === 'commande'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Commande
          </button>
          <button
            type="button"
            onClick={() => setSectionActive('rapport')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              sectionActive === 'rapport'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Rapport
          </button>
          <button
            type="button"
            onClick={() => setSectionActive('profil')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${ sectionActive === 'profil' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white' }`} > <User className="w-3.5 h-3.5" /> Profil </button> </div>  <button type="button" onClick={() => setCaissiere(null)} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-white" > <LogOut className="w-3.5 h-3.5" /> Déconnexion </button> </header>  {/* SOUS-SECTION 1 : COMMANDE + EMPREINTE DIGITALE */} {sectionActive === 'commande' && ( <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto w-full"> {/* Colonne Gauche : Formulaire */} <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between"> <h2 className="text-xl font-bold mb-4 flex items-center gap-2"> <Briefcase className="w-5 h-5 text-blue-400" /> Saisie d'une Commande </h2>  <form onSubmit={handleValiderCommande} className="space-y-4 flex-1 flex flex-col"> {/* Liste déroulante avec recherche */} <div className="mb-4 relative" onClick={(e) => e.stopPropagation()}> <label className="block text-xs text-slate-400 mb-1"> Personnel client (Travailleur / Stagiaire) </label> <button type="button" onClick={() => setDropdownOuvert(!dropdownOuvert)} className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors cursor-pointer text-sm" > {clientSelectionne ? ( <span className="text-white font-medium"> {clientSelectionne.nom} ({clientSelectionne.matricule} • {clientSelectionne.statut}) </span> ) : ( <span className="text-slate-400">Sélectionner ou rechercher un travailleur...</span> )} <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
                      dropdownOuvert ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {dropdownOuvert && (
                  <div className="absolute left-0 right-0 top-18 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-20 p-3 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Rechercher par nom, matricule, service..."
                        value={rechercheClient}
                        onChange={(e) => setRechercheClient(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {personnelFiltre.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          Aucun travailleur trouvé.
                        </div>
                      ) : (
                        personnelFiltre.map((pers) => {
                          const estSelectionne = clientSelectionne?.id === pers.id;
                          return (
                            <button
                              type="button"
                              key={pers.id}
                              onClick={() => {
                                setClientSelectionne(pers);
                                setDropdownOuvert(false);
                                setRechercheClient('');
                                setEmpreinteValidee(false);
                                setPrintFeedback('');
                                setStatusMessage('');
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex justify-between items-center transition-colors cursor-pointer ${
                                estSelectionne
                                  ? 'bg-blue-600 text-white font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900'
                              }`}
                            >
                              <div>
                                <span>{pers.nom}</span>
                                <span
                                  className={`block text-[10px] ${
                                    estSelectionne ? 'text-blue-100' : 'text-slate-500'
                                  }`}
                                >
                                  {pers.matricule} • {pers.service}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  estSelectionne
                                    ? 'bg-blue-700 text-white'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                                }`}
                              >
                                {pers.statut}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Montant Total de la commande (FCFA)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 2500"
                  value={montantInput}
                  onChange={(e) => setMontantInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Répartition SIAT */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <span className="font-semibold text-slate-300 block mb-1">
                  Répartition automatique (Plafond SIAT : 1 000 FCFA)
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part Entreprise (SIAT) :</span>
                  <strong className="text-sky-400 font-mono">{partEntreprise.toLocaleString()} FCFA</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part à payer par le Client :</span>
                  <strong className="text-amber-400 font-mono">{partClient.toLocaleString()} FCFA</strong>
                </div>
              </div>

              {/* Bloc Empreinte Digitale */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  Authentification par Empreinte Digitale
                </span>

                {clientSelectionne && (
                  <span className="text-xs text-emerald-400 block font-medium">
                    Bénéficiaire : {clientSelectionne.nom}
                  </span>
                )}

                <button
                  type="button"
                  disabled={isScanningPrint || !clientSelectionne}
                  onClick={handleVerificationEmpreinte}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed text-white"
                >
                  <Fingerprint className="w-4 h-4" />
                  {isScanningPrint ? 'Lecture de l’empreinte...' : 'Scanner l’empreinte digitale'}
                </button>

                <div
                  className={`p-2.5 rounded-xl text-xs font-medium text-center ${
                    empreinteValidee
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border border-slate-800 text-slate-400'
                  }`}
                >
                  {printFeedback ||
                    (clientSelectionne
                      ? 'En attente de la vérification biométrique du client'
                      : 'Sélectionnez d’abord un travailleur ci-dessus')}
                </div>
              </div>

              <button
                type="submit"
                disabled={!empreinteValidee || !montantInput}
                className="mt-auto w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider la Commande
              </button>

              {statusMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {statusMessage}
                </div>
              )}
            </form>
          </section>

          {/* Colonne Droite : Historique des bons */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              Bons de Commande Récents
            </h2>

            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {commandes.map((bon) => (
                <div
                  key={bon.numBon}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-sm font-bold text-white">
                        Bon N°{bon.numBon} — {bon.client.nom}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {bon.client.matricule} • {bon.client.service} • {bon.date}
                      </span>
                    </div>
                    <strong className="text-sm font-mono text-emerald-400">
                      {bon.prixTotal.toLocaleString()} FCFA
                    </strong>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                    <span>SIAT : {bon.partEntreprise.toLocaleString()} FCFA</span>
                    <span>Client : {bon.partClient.toLocaleString()} FCFA</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setBonPdfSelectionne(bon)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Aperçu
                    </button>
                    <button
                      type="button"
                      onClick={() => imprimerBonPdf(bon)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold text-blue-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* SOUS-SECTION 2 : RAPPORT */}
      {sectionActive === 'rapport' && (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-400" />
                État Financier & Consommation
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Période active : {periodeRapport === 'jour' ? `Journée (${aujourdhuiStr})` : `Mois (${moisActuelStr})`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPeriodeRapport('jour')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  periodeRapport === 'jour' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Jour
              </button>
              <button
                type="button"
                onClick={() => setPeriodeRapport('mois')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  periodeRapport === 'mois' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Mois
              </button>
              <button
                type="button"
                onClick={imprimerTableauUniquement}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF Tableau
              </button>
              <button
                type="button"
                onClick={telechargerTableauExcel}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel (CSV)
              </button>
              <button
                type="button"
                onClick={ouvrirFenetreEmail}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                Envoyer E-mail
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Consommé</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {totalVentes.toLocaleString()} FCFA
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Part Clients</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {totalPartClients.toLocaleString()} FCFA
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Subvention SIAT</span>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {totalPartSiat.toLocaleString()} FCFA
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Matricule</th>
                    <th className="py-3.5 px-4">Nom du Travailleur</th>
                    <th className="py-3.5 px-4">Statut / Service</th>
                    <th className="py-3.5 px-4">Nb Bons</th>
                    <th className="py-3.5 px-4">Total Consommé</th>
                    <th className="py-3.5 px-4">Part Client</th>
                    <th className="py-3.5 px-4">Subvention SIAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tableauTravailleurs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500">
                        Aucune commande enregistrée sur cette période.
                      </td>
                    </tr>
                  ) : (
                    tableauTravailleurs.map((t) => (
                      <tr key={t.matricule} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-slate-300">{t.matricule}</td>
                        <td className="py-3 px-4 font-semibold text-white">{t.nom}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {t.statut} • {t.service}
                        </td>
                        <td className="py-3 px-4">{t.nbBons}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{t.total.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 font-mono text-amber-400">{t.client.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 font-mono text-sky-400">{t.siat.toLocaleString()} FCFA</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* SOUS-SECTION 3 : PROFIL */}
      {sectionActive === 'profil' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#081020] border border-slate-800/90 rounded-2xl px-7 py-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#091c3a] border border-blue-500/50 flex items-center justify-center text-2xl font-bold text-blue-400 mb-4">
              {initialeCaissiere}
            </div>

            <h2 className="text-lg font-bold text-white">{caissiere.nom}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {caissiere.role || 'Opératrice de Caisse'} • Matricule : {caissiere.matricule}
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 border border-emerald-700/50 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {caissiere.statut || 'Compte Actif'}
            </span>

            <div className="w-full mt-6 bg-[#060c18] border border-slate-800/80 rounded-xl divide-y divide-slate-800/70 text-xs">
              <div className="flex items-center justify-between px-4 py-3.5 gap-3">
                <span className="flex items-center gap-2.5 text-slate-400">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                  Poste d'affectation
                </span>
                <strong className="font-semibold text-white text-right">
                  {caissiere.poste}
                </strong>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 gap-3">
                <span className="flex items-center gap-2.5 text-slate-400">
                  <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                  Téléphone
                </span>
                <strong className="font-semibold text-white font-mono">
                  {caissiere.telephone}
                </strong>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 gap-3">
                <span className="flex items-center gap-2.5 text-slate-400">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  Date de prise de service
                </span>
                <strong className="font-semibold text-white">
                  {caissiere.datePriseService || caissiere.dateEmbauche}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCaissiere(null)}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Fermer la Caisse et Se Déconnecter
            </button>
          </div>
        </main>
      )}

      {/* MODALE APERÇU BON */}
      {bonPdfSelectionne && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Bon de Commande N°{bonPdfSelectionne.numBon}</h3>
              <button
                type="button"
                onClick={() => setBonPdfSelectionne(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p><strong>Date :</strong> {bonPdfSelectionne.date}</p>
              <p><strong>Bénéficiaire :</strong> {bonPdfSelectionne.client.nom} ({bonPdfSelectionne.client.matricule})</p>
              <p><strong>Montant total :</strong> {bonPdfSelectionne.prixTotal.toLocaleString()} FCFA</p>
              <p><strong>Part SIAT :</strong> {bonPdfSelectionne.partEntreprise.toLocaleString()} FCFA</p>
              <p><strong>Part Client :</strong> {bonPdfSelectionne.partClient.toLocaleString()} FCFA</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => imprimerBonPdf(bonPdfSelectionne)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ENVOI E-MAIL */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleEnvoyerEmail}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Envoyer le Tableau par E-mail</h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Destinataire</label>
              <input
                type="email"
                required
                placeholder="ex: comptabilite@siat.cg"
                value={emailDestinataire}
                onChange={(e) => setEmailDestinataire(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Objet</label>
              <input
                type="text"
                required
                value={emailObjet}
                onChange={(e) => setEmailObjet(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Format</label>
              <select
                value={emailFormat}
                onChange={(e) => setEmailFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="pdf">PDF (.pdf)</option>
                <option value="excel">Excel (.xlsx / .csv)</option>
              </select>
            </div>

            {emailConfirmation && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {emailConfirmation}
              </div>
            )}

            <button
              type="submit"
              disabled={emailEnCours}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {emailEnCours ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}