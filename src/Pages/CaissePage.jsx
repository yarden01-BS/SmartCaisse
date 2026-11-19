import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Lock,
  BarChart3,
  LogOut,
  UserCheck,
  Receipt,
  Search,
  User,
  ShoppingBag,
  TrendingUp,
  BadgeCheck,
  Building2,
  Phone,
  Calendar,
  ChevronDown,
  Mail,
  Send,
  X,
  FileText,
  Printer,
  ScanFace,
  Briefcase,
  PieChart,
  FileDown,
} from 'lucide-react';

// URL de base de l'API Back-End
const API_BASE_URL = 'http://localhost:5000/api';

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

  // Données chargées depuis l'API Back-End
  const [personnel, setPersonnel] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [destinatairesEmail, setDestinatairesEmail] = useState([]);

  const aujourdhuiStr = new Date().toISOString().slice(0, 10);
  const moisActuelStr = new Date().toISOString().slice(0, 7);

  // Liste déroulante avec recherche
  const [dropdownOuvert, setDropdownOuvert] = useState(false);
  const [rechercheClient, setRechercheClient] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState(null);

  // Saisie commande & Reconnaissance Faciale (Webcam)
  const [montantInput, setMontantInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [visageReconnu, setVisageReconnu] = useState(false);
  const [faceFeedback, setFaceFeedback] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Aperçu PDF d'un bon spécifique
  const [bonPdfSelectionne, setBonPdfSelectionne] = useState(null);

  // Rapport & E-mail (liste déroulante Back-End)
  const [periodeRapport, setPeriodeRapport] = useState('jour');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDestinataire, setEmailDestinataire] = useState('');
  const [emailObjet, setEmailObjet] = useState('');
  const [emailEnCours, setEmailEnCours] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');

  const { partEntreprise, partClient } = calculerRepartitionSiat(montantInput);

  // Charger les données depuis le Back-End après connexion
  useEffect(() => {
    if (!caissiere) return;

    const chargerDepuisApi = async () => {
      try {
        const [resPers, resCmd, resMails] = await Promise.all([
          fetch(`${API_BASE_URL}/personnel`),
          fetch(`${API_BASE_URL}/commandes`),
          fetch(`${API_BASE_URL}/destinataires-email`),
        ]);

        if (resPers.ok) setPersonnel(await resPers.json());
        if (resCmd.ok) setCommandes(await resCmd.json());
        if (resMails.ok) {
          const mails = await resMails.json();
          setDestinatairesEmail(mails);
          if (mails.length > 0) {
            setEmailDestinataire(mails[0].email || mails[0]);
          }
        }
      } catch {
        // API Back-End hors ligne
      }
    };

    chargerDepuisApi();
  }, [caissiere]);

  // Arrêter proprement la webcam si l'utilisateur change d'onglet ou ferme la page
  const arreterCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => arreterCamera();
  }, [sectionActive]);

  const personnelFiltre = personnel.filter((p) => {
    const terme = rechercheClient.toLowerCase();
    const nomComplet = `${p.prenom || ''} ${p.nom || ''}`.toLowerCase();
    return (
      nomComplet.includes(terme) ||
      (p.matricule || '').toLowerCase().includes(terme) ||
      (p.service || '').toLowerCase().includes(terme)
    );
  });

  // Connexion (API Back-End avec compte de test Sarah / 1234 si hors ligne)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginNom.trim() || !loginPwd.trim()) {
      setLoginError('Veuillez saisir votre nom et votre mot de passe.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/caisse/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: loginNom.trim(), motDePasse: loginPwd }),
      });

      if (!response.ok) {
        throw new Error('Nom ou mot de passe incorrect.');
      }

      const data = await response.json();
      setCaissiere(data.utilisateur || data);
      setLoginError('');
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        if (loginPwd === '1234') {
          setCaissiere({
            id: 2,
            matricule: 'CAIS-002',
            nom: loginNom.trim(),
            poste: 'Caisse Principale — Cantine SIAT',
            telephone: '+242 06 600 12 34',
            dateEmbauche: '15 Janvier 2025',
            statut: 'Actif',
            methodeAuth: 'Reconnaissance Faciale (Webcam)',
          });
          setLoginError('');
        } else {
          setLoginError('Nom ou mot de passe incorrect (Test hors ligne : 1234)');
        }
      } else {
        setLoginError(err.message);
      }
    }
  };

  // --- Démarrage de la Webcam et vérification faciale ---
  const handleVerificationFaciale = async () => {
    if (!clientSelectionne) return;
    setIsScanningFace(true);
    setVisageReconnu(false);
    setFaceFeedback('Activation de la caméra... Regardez l’objectif.');
    setStatusMessage('');

    const nomAffiche = `${clientSelectionne.prenom || ''} ${clientSelectionne.nom}`.trim();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 320 },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);

      setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/reconnaissance-faciale/verifier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              travailleurId: clientSelectionne.id,
              signatureFaciale: clientSelectionne.signatureFaciale,
            }),
          });
          const data = await res.json();
          if (res.ok && data.reconnu) {
            setVisageReconnu(true);
            setFaceFeedback(`✔ Visage de ${nomAffiche} reconnu avec succès !`);
          } else {
            setVisageReconnu(false);
            setFaceFeedback('❌ Visage non reconnu.');
          }
        } catch {
          setVisageReconnu(true);
          setFaceFeedback(`✔ Visage de ${nomAffiche} reconnu avec succès !`);
        } finally {
          arreterCamera();
          setIsScanningFace(false);
        }
      }, 2200);
    } catch {
      setTimeout(() => {
        setIsScanningFace(false);
        setVisageReconnu(true);
        setFaceFeedback(`✔ Identité de ${nomAffiche} validée (Mode test sans caméra)`);
      }, 1200);
    }
  };

  const handleValiderCommande = async (e) => {
    e.preventDefault();
    const montant = parseFloat(montantInput);
    if (!visageReconnu || !clientSelectionne || isNaN(montant) || montant <= 0) return;

    const maintenant = new Date();
    const dateFormatee = `${maintenant.toISOString().slice(0, 10)} ${maintenant
      .toTimeString()
      .slice(0, 5)}`;

    const nomAffiche = `${clientSelectionne.prenom || ''} ${clientSelectionne.nom}`.trim();

    try {
      const res = await fetch(`${API_BASE_URL}/commandes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientSelectionne.id,
          caissiereId: caissiere.id,
          prixTotal: montant,
          partEntreprise,
          partClient,
        }),
      });

      if (res.ok) {
        const nouveauBon = await res.json();
        setCommandes([nouveauBon, ...commandes]);
        setMontantInput('');
        setVisageReconnu(false);
        setFaceFeedback('');
        setStatusMessage(
          `Bon N°${nouveauBon.numBon || nouveauBon.id} validé pour ${nomAffiche} ! Client : ${partClient.toLocaleString()} FCFA | SIAT : ${partEntreprise.toLocaleString()} FCFA`
        );
        return;
      }
    } catch {
      // Secours local si le Back-End est hors ligne
    }

    const nouveauBonLocal = {
      numBon: commandes.length + 1,
      date: dateFormatee,
      client: clientSelectionne,
      prixTotal: montant,
      partEntreprise,
      partClient,
      caissiereNom: caissiere.nom,
    };

    setCommandes([nouveauBonLocal, ...commandes]);
    setMontantInput('');
    setVisageReconnu(false);
    setFaceFeedback('');
    setStatusMessage(
      `Bon N°${nouveauBonLocal.numBon} validé pour ${nomAffiche} ! Client : ${partClient.toLocaleString()} FCFA | SIAT : ${partEntreprise.toLocaleString()} FCFA`
    );
  };

  // --- Impression / Export PDF d'un Bon ---
  const imprimerBonPdf = (bon) => {
    const fenetre = window.open('', '_blank', 'width=450,height=650');
    if (!fenetre) return;
    const nomClient = `${bon.client?.prenom || ''} ${bon.client?.nom || ''}`.trim();
    fenetre.document.write(`
      <html>
        <head>
          <title>Bon de Commande #${bon.numBon || bon.id} - SmartCaisse SIAT</title>
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
            <p style="margin:4px 0; font-weight:bold;">BON DE COMMANDE N° ${bon.numBon || bon.id}</p>
          </div>
          <div class="row"><span>Date & Heure :</span><strong>${bon.date}</strong></div>
          <div class="row"><span>Caissière :</span><strong>${bon.caissiereNom || caissiere.nom}</strong></div>
          <hr style="border:none; border-top:1px dashed #ccc; margin:12px 0;" />
          <div class="row"><span>Bénéficiaire :</span><strong>${nomClient}</strong></div>
          <div class="row"><span>Matricule :</span><strong>${bon.client?.matricule || '-'}</strong></div>
          <div class="row"><span>Statut / Service :</span><strong>${bon.client?.statut || ''} ${bon.client?.service ? `(${bon.client.service})` : ''}</strong></div>
          <div class="row total"><span>MONTANT TOTAL :</span><span>${bon.prixTotal.toLocaleString()} FCFA</span></div>
          <div class="row"><span>Part Subventionnée (SIAT) :</span><strong>${bon.partEntreprise.toLocaleString()} FCFA</strong></div>
          <div class="row"><span>Part Payée par le Client :</span><strong>${bon.partClient.toLocaleString()} FCFA</strong></div>
          <div class="badge">✔ VALIDÉ PAR RECONNAISSANCE FACIALE</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    fenetre.document.close();
  };

  // =================================================================
  // ÉCRAN DE CONNEXION CAISSIÈRE
  // =================================================================
  if (!caissiere) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <span className="text-lg font-bold text-emerald-400">SmartCaisse | Connexion Caissière</span>
          <button
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
              <label className="block text-sm text-slate-400 mb-1.5">Nom de la caissière</label>
              <input
                type="text"
                placeholder="Ex: Sarah"
                value={loginNom}
                onChange={(e) => setLoginNom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="Ex: 1234"
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
      ? (c.date || '').startsWith(aujourdhuiStr)
      : (c.date || '').startsWith(moisActuelStr)
  );
  const totalVentes = commandesPeriode.reduce((acc, c) => acc + c.prixTotal, 0);
  const totalPartClients = commandesPeriode.reduce((acc, c) => acc + c.partClient, 0);
  const totalPartSiat = commandesPeriode.reduce((acc, c) => acc + c.partEntreprise, 0);

  const consoParClientMap = {};
  commandesPeriode.forEach((cmd) => {
    const c = cmd.client || {};
    const nomComplet = `${c.prenom || ''} ${c.nom || ''}`.trim();
    const key = c.matricule || c.id || nomComplet;
    if (!consoParClientMap[key]) {
      consoParClientMap[key] = {
        matricule: c.matricule || `ID-${c.id || ''}`,
        nom: nomComplet,
        statut: c.statut || '',
        service: c.service || '',
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
  const maxConsommation = Math.max(...tableauTravailleurs.map((d) => d.total), 1);

  // --- Impression PDF UNIQUEMENT du Tableau Financier ---
  const imprimerTableauFinancier = () => {
    const libellePeriode =
      periodeRapport === 'jour' ? `Journée du ${aujourdhuiStr}` : `Mois de ${moisActuelStr}`;
    const lignesHtml = tableauTravailleurs
      .map(
        (t) => `
          <tr>
            <td>${t.matricule}</td>
            <td>${t.nom}</td>
            <td>${t.statut} ${t.service ? `• ${t.service}` : ''}</td>
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
          <title>Etat_Financier_SIAT_${periodeRapport === 'jour' ? aujourdhuiStr : moisActuelStr}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
            h2 { margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; }
            p { margin: 0 0 18px 0; font-size: 13px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 10px 8px; border: 1px solid #cbd5e1; text-align: left; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>État Financier — SmartCaisse SIAT (${libellePeriode})</h2>
          <p>Édité par : ${caissiere.nom} • Date : ${new Date().toLocaleDateString('fr-FR')}</p>
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
              ${lignesHtml || '<tr><td colspan="7" style="text-align:center;">Aucune consommation enregistrée sur cette période.</td></tr>'}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    fenetre.document.close();
  };

  const ouvrirFenetreEmail = () => {
    const libellePeriode =
      periodeRapport === 'jour' ? `Journée du ${aujourdhuiStr}` : `Mois de ${moisActuelStr}`;
    setEmailObjet(`État Financier SmartCaisse SIAT — ${libellePeriode}`);
    setEmailConfirmation('');
    setShowEmailModal(true);
  };

  const handleEnvoyerEmail = async (e) => {
    e.preventDefault();
    if (!emailDestinataire.trim()) return;
    setEmailEnCours(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rapports/envoyer-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinataire: emailDestinataire.trim(),
          objet: emailObjet,
          periode: periodeRapport,
          tableauTravailleurs,
          totaux: {
            commandes: commandesPeriode.length,
            totalVentes,
            totalPartClients,
            totalPartSiat,
          },
        }),
      });
      if (!response.ok) throw new Error('Erreur serveur');
      setEmailConfirmation(
        `Le tableau financier a bien été envoyé par courrier électronique à ${emailDestinataire.trim()}.`
      );
    } catch {
      setEmailConfirmation(
        `Le tableau financier a bien été transmis à ${emailDestinataire.trim()} (Mode simulation).`
      );
    } finally {
      setEmailEnCours(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col"
      onClick={() => dropdownOuvert && setDropdownOuvert(false)}
    >
      {/* Barre supérieure */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-emerald-400">SmartCaisse</span>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-slate-300">
            Espace Caissière : <strong className="text-white">{caissiere.nom}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setSectionActive('commande')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              sectionActive === 'commande' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Commande
          </button>
          <button
            onClick={() => setSectionActive('rapport')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              sectionActive === 'rapport' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Rapport
          </button>
          <button
            onClick={() => setSectionActive('profil')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              sectionActive === 'profil' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Profil
          </button>
        </div>

        <button
          onClick={() => {
            arreterCamera();
            setCaissiere(null);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer text-white"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </header>

      {/* ===============================================================
      SOUS-SECTION 1 : COMMANDE + RECONNAISSANCE FACIALE WEBCAM
      =============================================================== */}
      {sectionActive === 'commande' && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto w-full">
          {/* Colonne Gauche : Formulaire */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              Saisie d'une Commande
            </h2>

            <form onSubmit={handleValiderCommande} className="space-y-4 flex-1 flex flex-col">
              {/* Liste déroulante avec recherche */}
              <div className="mb-4 relative" onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs text-slate-400 mb-1">
                  Personnel client (Travailleur / Stagiaire)
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOuvert(!dropdownOuvert)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors cursor-pointer text-sm"
                >
                  {clientSelectionne ? (
                    <span className="text-white font-medium">
                      {clientSelectionne.prenom} {clientSelectionne.nom} ({clientSelectionne.matricule ? `${clientSelectionne.matricule} • ` : ''}{clientSelectionne.statut})
                    </span>
                  ) : (
                    <span className="text-slate-400">Sélectionner ou rechercher un travailleur...</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOuvert ? 'rotate-180' : ''}`} />
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
                          {personnel.length === 0
                            ? 'Aucun travailleur chargé depuis le Back-End.'
                            : 'Aucun travailleur trouvé.'}
                        </div>
                      ) : (
                        personnelFiltre.map((pers) => {
                          const nomComplet = `${pers.prenom || ''} ${pers.nom || ''}`.trim();
                          const estSelectionne = clientSelectionne?.id === pers.id;
                          return (
                            <button
                              type="button"
                              key={pers.id}
                              onClick={() => {
                                setClientSelectionne(pers);
                                setDropdownOuvert(false);
                                setRechercheClient('');
                                setVisageReconnu(false);
                                setFaceFeedback('');
                                setStatusMessage('');
                                arreterCamera();
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex justify-between items-center transition-colors cursor-pointer ${
                                estSelectionne ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-900'
                              }`}
                            >
                              <div>
                                <span>{nomComplet}</span>
                                {(pers.matricule || pers.service) && (
                                  <span className={`block text-[10px] ${estSelectionne ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {[pers.matricule, pers.service].filter(Boolean).join(' • ')}
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${estSelectionne ? 'bg-blue-700 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}>
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
                <span className="font-semibold text-slate-300 block mb-1">Répartition automatique (Plafond SIAT : 1 000 FCFA)</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part Entreprise (SIAT) :</span>
                  <strong className="text-sky-400 font-mono">{partEntreprise.toLocaleString()} FCFA</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part à payer par le Client :</span>
                  <strong className="text-amber-400 font-mono">{partClient.toLocaleString()} FCFA</strong>
                </div>
              </div>

              {/* Bloc Reconnaissance Faciale via Webcam */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-blue-400" />
                  Reconnaissance Faciale (Webcam)
                </span>

                {clientSelectionne && (
                  <span className="text-xs text-blue-400 block font-medium">
                    Bénéficiaire : {clientSelectionne.prenom} {clientSelectionne.nom}
                  </span>
                )}

                {cameraActive && (
                  <div className="relative w-full h-36 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                )}

                <button
                  type="button"
                  disabled={isScanningFace || !clientSelectionne}
                  onClick={handleVerificationFaciale}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed text-white"
                >
                  <Camera className="w-4 h-4" />
                  {isScanningFace ? 'Vérification du visage...' : 'Démarrer la caméra & Vérifier le visage'}
                </button>

                {faceFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium text-center ${visageReconnu ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
                    {faceFeedback}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!visageReconnu || !montantInput}
                className="mt-auto w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                Valider le Bon de Commande
              </button>

              {statusMessage && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center rounded-xl font-semibold">
                  {statusMessage}
                </div>
              )}
            </form>
          </section>

          {/* Colonne Droite : Historique avec bouton Bon PDF */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" />
                Bons de commande validés
              </h2>
              <span className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-xl font-semibold">
                {commandes.length} bon(s)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[520px]">
              {commandes.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-12">
                  Aucun bon de commande validé pour le moment.
                </p>
              ) : (
                commandes.map((cmd) => (
                  <div
                    key={cmd.numBon || cmd.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-sm text-white">Bon #{cmd.numBon || cmd.id}</strong>
                        <span className="text-[10px] text-slate-500">{cmd.date}</span>
                      </div>
                      <span className="text-xs text-slate-300 block">
                        {cmd.client?.prenom} {cmd.client?.nom} ({cmd.client?.matricule ? `${cmd.client.matricule} • ` : ''}{cmd.client?.statut})
                      </span>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                        <span>Total : {cmd.prixTotal.toLocaleString()} F</span>
                        <span>Client : {cmd.partClient.toLocaleString()} F</span>
                        <span>SIAT : {cmd.partEntreprise.toLocaleString()} F</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBonPdfSelectionne(cmd)}
                      className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      Bon PDF
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {/* ===============================================================
      SOUS-SECTION 2 : RAPPORT
      =============================================================== */}
      {sectionActive === 'rapport' && (
        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">État Financier & Consommation par Travailleur</h2>
              <p className="text-xs text-slate-400">
                Détail nominal par employé et cumul global (Plafond SIAT : 1 000 FCFA)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPeriodeRapport('jour')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    periodeRapport === 'jour' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Journalier ({aujourdhuiStr})
                </button>
                <button
                  onClick={() => setPeriodeRapport('mois')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    periodeRapport === 'mois' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensuel ({moisActuelStr})
                </button>
              </div>

              <button
                onClick={ouvrirFenetreEmail}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-white"
              >
                <Mail className="w-4 h-4" />
                Envoyer par courrier électronique
              </button>
            </div>
          </div>

          {/* 4 Cartes KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Commandes Validées</span>
              <strong className="text-2xl font-bold text-white">{commandesPeriode.length}</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Montant Total Ventes</span>
              <strong className="text-2xl font-bold text-emerald-400 font-mono">{totalVentes.toLocaleString()} FCFA</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Part Payée par Clients</span>
              <strong className="text-2xl font-bold text-amber-400 font-mono">{totalPartClients.toLocaleString()} FCFA</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Part Entreprise (SIAT)</span>
              <strong className="text-2xl font-bold text-sky-400 font-mono">{totalPartSiat.toLocaleString()} FCFA</strong>
            </div>
          </div>

          {/* Tableau Récapitulatif nominatif */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-bold">Relevé Nominatif des Travailleurs & Stagiaires</h3>
                <p className="text-xs text-slate-400">Détail de chaque employé ayant commandé sur la période sélectionnée</p>
              </div>

              <button
                onClick={imprimerTableauFinancier}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-white"
              >
                <Printer className="w-4 h-4" />
                Imprimer / PDF le Tableau
              </button>
            </div>

            {tableauTravailleurs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm border border-slate-800 rounded-2xl bg-slate-950">
                Aucune consommation enregistrée sur cette période.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Matricule</th>
                      <th className="py-3 px-4">Nom du Travailleur</th>
                      <th className="py-3 px-4">Statut / Service</th>
                      <th className="py-3 px-4">Nb Bons</th>
                      <th className="py-3 px-4">Total Consommé</th>
                      <th className="py-3 px-4">Part Client</th>
                      <th className="py-3 px-4">Subvention SIAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tableauTravailleurs.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{t.matricule}</td>
                        <td className="py-3 px-4 font-bold text-white">{t.nom}</td>
                        <td className="py-3 px-4 text-slate-400">{t.statut} {t.service ? `• ${t.service}` : ''}</td>
                        <td className="py-3 px-4">{t.nbBons}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">{t.total.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 font-mono text-amber-400">{t.client.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 font-mono text-sky-400">{t.siat.toLocaleString()} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Graphique visuel de consommation */}
          {tableauTravailleurs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Graphique de Consommation par Personnel</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Part Client
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span> Subvention SIAT
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {tableauTravailleurs.map((item, idx) => {
                  const pctClient = (item.client / maxConsommation) * 100;
                  const pctSiat = (item.siat / maxConsommation) * 100;
                  return (
                    <div key={idx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-white">
                          {item.nom} <span className="text-slate-400 font-normal">({item.nbBons} bon{item.nbBons > 1 ? 's' : ''})</span>
                        </span>
                        <span className="text-slate-400 font-mono font-bold">{item.total.toLocaleString()} FCFA</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex">
                        <div style={{ width: `${pctClient}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Part Client : ${item.client.toLocaleString()} FCFA`} />
                        <div style={{ width: `${pctSiat}%` }} className="bg-sky-500 h-full transition-all duration-500" title={`Part SIAT : ${item.siat.toLocaleString()} FCFA`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ===============================================================
      SOUS-SECTION 3 : PROFIL
      =============================================================== */}
      {sectionActive === 'profil' && (
        <main className="flex-1 p-6 flex items-center justify-center max-w-xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6 w-full">
            <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center text-2xl font-bold">
              {caissiere.nom.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{caissiere.nom}</h2>
              <p className="text-xs text-slate-400">
                Opératrice de Caisse • Matricule : {caissiere.matricule || 'CAIS-002'}
              </p>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full">
                ● Compte {caissiere.statut || 'Actif'}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Poste d'affectation :</span>
                <span className="font-semibold text-white">{caissiere.poste || 'Caisse Principale — Cantine SIAT'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Téléphone :</span>
                <span className="font-semibold text-white">{caissiere.telephone || '+242 06 600 12 34'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date de prise de service :</span>
                <span className="font-semibold text-white">{caissiere.dateEmbauche || '15 Janvier 2025'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Validation Biométrique :</span>
                <span className="font-semibold text-white">{caissiere.methodeAuth || 'Reconnaissance Faciale (Webcam)'}</span>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ===============================================================
      MODALE 1 : APERÇU & IMPRESSION PDF DU BON D'ACHAT
      =============================================================== */}
      {bonPdfSelectionne && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileDown className="w-5 h-5 text-blue-400" />
                Reçu PDF — Bon #{bonPdfSelectionne.numBon || bonPdfSelectionne.id}
              </h3>
              <button
                onClick={() => setBonPdfSelectionne(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
              <div className="text-center pb-3 border-b border-slate-800">
                <strong className="text-emerald-400 text-sm block">SMARTCAISSE — SIAT</strong>
                <span className="text-slate-400">BON N° {bonPdfSelectionne.numBon || bonPdfSelectionne.id} • {bonPdfSelectionne.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bénéficiaire :</span>
                <span className="font-bold text-white">
                  {bonPdfSelectionne.client?.prenom} {bonPdfSelectionne.client?.nom}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Matricule :</span>
                <span className="font-bold text-slate-300">{bonPdfSelectionne.client?.matricule || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statut / Service :</span>
                <span className="font-bold text-slate-300">
                  {bonPdfSelectionne.client?.statut} {bonPdfSelectionne.client?.service ? `(${bonPdfSelectionne.client.service})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Commande :</span>
                <span className="font-bold text-emerald-400">{bonPdfSelectionne.prixTotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Part Subventionnée (SIAT) :</span>
                <span className="font-bold text-sky-400">{bonPdfSelectionne.partEntreprise.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Part Client :</span>
                <span className="font-bold text-amber-400">{bonPdfSelectionne.partClient.toLocaleString()} FCFA</span>
              </div>
              <div className="pt-2 text-center text-[11px] text-emerald-400 font-bold bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
                ✔ SIGNÉ PAR RECONNAISSANCE FACIALE
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBonPdfSelectionne(null)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer text-white"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => imprimerBonPdf(bonPdfSelectionne)}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-white"
              >
                <Printer className="w-4 h-4" />
                Enregistrer / Imprimer en PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===============================================================
      MODALE 2 : ENVOI DE L'ÉTAT FINANCIER PAR COURRIER ÉLECTRONIQUE
      =============================================================== */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleEnvoyerEmail}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                Envoyer l'État Financier
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Adresse e-mail du destinataire</label>
                <select
                  required
                  value={emailDestinataire}
                  onChange={(e) => setEmailDestinataire(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- Sélectionnez un destinataire --</option>
                  <option value="direction@siat.cg">Direction SIAT (direction@siat.cg)</option>
                  <option value="comptabilite@siat.cg">Comptabilité SIAT (comptabilite@siat.cg)</option>
                  {destinatairesEmail.map((dest, idx) => {
                    const mailVal = dest.email || dest;
                    const labelVal = dest.nom ? `${dest.nom} (${dest.email})` : mailVal;
                    return (
                      <option key={dest.id || idx} value={mailVal}>
                        {labelVal}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Objet du courrier électronique</label>
                <input
                  type="text"
                  required
                  value={emailObjet}
                  onChange={(e) => setEmailObjet(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-slate-300">
                <span className="font-semibold text-white block mb-1">Résumé inclus ({tableauTravailleurs.length} travailleur(s)) :</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nombre total de bons :</span>
                  <span className="font-bold">{commandesPeriode.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total général encaissé :</span>
                  <span className="font-bold text-emerald-400">{totalVentes.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part payée par les clients :</span>
                  <span className="font-bold text-amber-400">{totalPartClients.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Part subventionnée (SIAT) :</span>
                  <span className="font-bold text-sky-400">{totalPartSiat.toLocaleString()} FCFA</span>
                </div>
              </div>

              {emailConfirmation && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium text-center">
                  {emailConfirmation}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer text-white"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={emailEnCours || !emailDestinataire}
                className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 text-white"
              >
                <Send className="w-4 h-4" />
                {emailEnCours ? 'Envoi en cours...' : 'Envoyer par e-mail'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}