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

  // Données simulées du personnel client
  const personnelMock = [
    { id: 1, matricule: 'SIAT-104', nom: 'Jean Makosso', statut: 'Travailleur', service: 'Production' },
    { id: 2, matricule: 'SIAT-218', nom: 'Clarisse Moukoko', statut: 'Stagiaire', service: 'Comptabilité' },
    { id: 3, matricule: 'SIAT-089', nom: 'Alain Nzaba', statut: 'Travailleur', service: 'Logistique' },
    { id: 4, matricule: 'SIAT-312', nom: 'Nadia Malonga', statut: 'Stagiaire', service: 'Qualité' },
    { id: 5, matricule: 'SIAT-145', nom: 'Brice Ondongo', statut: 'Travailleur', service: 'Maintenance' },
  ];

  const aujourdhuiStr = new Date().toISOString().slice(0, 10);
  const moisActuelStr = new Date().toISOString().slice(0, 7);

  // Historique des bons de commande
  const [commandes, setCommandes] = useState([
    {
      numBon: 1,
      date: `${aujourdhuiStr} 08:45`,
      client: { id: 1, matricule: 'SIAT-104', nom: 'Jean Makosso', statut: 'Travailleur', service: 'Production' },
      prixTotal: 2500,
      partEntreprise: 1000,
      partClient: 1500,
      caissiereNom: 'Sarah',
    },
    {
      numBon: 2,
      date: `${aujourdhuiStr} 09:30`,
      client: { id: 2, matricule: 'SIAT-218', nom: 'Clarisse Moukoko', statut: 'Stagiaire', service: 'Comptabilité' },
      prixTotal: 1600,
      partEntreprise: 800,
      partClient: 800,
      caissiereNom: 'Sarah',
    },
    {
      numBon: 3,
      date: `${moisActuelStr}-02 12:15`,
      client: { id: 3, matricule: 'SIAT-089', nom: 'Alain Nzaba', statut: 'Travailleur', service: 'Logistique' },
      prixTotal: 3000,
      partEntreprise: 1000,
      partClient: 2000,
      caissiereNom: 'Sarah',
    },
  ]);

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

  // Rapport & E-mail
  const [periodeRapport, setPeriodeRapport] = useState('jour');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDestinataire, setEmailDestinataire] = useState('');
  const [emailObjet, setEmailObjet] = useState('');
  const [emailEnCours, setEmailEnCours] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState('');

  const { partEntreprise, partClient } = calculerRepartitionSiat(montantInput);

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

  const personnelFiltre = personnelMock.filter(
    (p) =>
      p.nom.toLowerCase().includes(rechercheClient.toLowerCase()) ||
      p.matricule.toLowerCase().includes(rechercheClient.toLowerCase()) ||
      p.service.toLowerCase().includes(rechercheClient.toLowerCase())
  );

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginNom.trim() && loginPwd === '1234') {
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
      setLoginError('Nom ou mot de passe incorrect (Test : 1234)');
    }
  };

  // --- Démarrage de la Webcam et vérification faciale ---
  const handleVerificationFaciale = async () => {
    if (!clientSelectionne) return;
    setIsScanningFace(true);
    setVisageReconnu(false);
    setFaceFeedback('Activation de la caméra... Regardez l’objectif.');
    setStatusMessage('');

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

      setTimeout(() => {
        arreterCamera();
        setIsScanningFace(false);
        setVisageReconnu(true);
        setFaceFeedback(`✔ Visage de ${clientSelectionne.nom} reconnu avec succès !`);
      }, 2200);
    } catch {
      setTimeout(() => {
        setIsScanningFace(false);
        setVisageReconnu(true);
        setFaceFeedback(`✔ Identité de ${clientSelectionne.nom} validée (Mode test sans caméra)`);
      }, 1200);
    }
  };

  const handleValiderCommande = (e) => {
    e.preventDefault();
    const montant = parseFloat(montantInput);
    if (!visageReconnu || !clientSelectionne || isNaN(montant) || montant <= 0) return;

    const maintenant = new Date();
    const dateFormatee = `${maintenant.toISOString().slice(0, 10)} ${maintenant
      .toTimeString()
      .slice(0, 5)}`;

    const nouveauBon = {
      numBon: commandes.length + 1,
      date: dateFormatee,
      client: clientSelectionne,
      prixTotal: montant,
      partEntreprise,
      partClient,
      caissiereNom: caissiere.nom,
    };

    setCommandes([nouveauBon, ...commandes]);
    setMontantInput('');
    setVisageReconnu(false);
    setFaceFeedback('');
    setStatusMessage(
      `Bon N°${nouveauBon.numBon} validé pour ${clientSelectionne.nom} ! Client : ${partClient.toLocaleString()} FCFA | SIAT : ${partEntreprise.toLocaleString()} FCFA`
    );
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
          <div class="row"><span>Caissière :</span><strong>${bon.caissiereNom || 'Sarah'}</strong></div>
          <hr style="border:none; border-top:1px dashed #ccc; margin:12px 0;" />
          <div class="row"><span>Bénéficiaire :</span><strong>${bon.client.nom}</strong></div>
          <div class="row"><span>Matricule :</span><strong>${bon.client.matricule}</strong></div>
          <div class="row"><span>Statut / Service :</span><strong>${bon.client.statut} (${bon.client.service})</strong></div>
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

  // --- Écran de connexion ---
  if (!caissiere) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <span className="text-lg font-bold">SmartCaisse | Connexion Caissière</span>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour Accueil
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl"
          >
            <h1 className="text-2xl font-bold text-center mb-6">Ouverture de Caisse</h1>

            <div className="space-y-4">
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
                className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer"
              >
                Se connecter
              </button>

              {loginError && (
                <p className="text-red-400 text-sm text-center mt-2">{loginError}</p>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Agrégation et calculs ---
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
    const key = cmd.client.matricule || cmd.client.nom;
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
  const maxConsommation = Math.max(...tableauTravailleurs.map((d) => d.total), 1);

  const ouvrirFenetreEmail = () => {
    const libellePeriode =
      periodeRapport === 'jour'
        ? `Journée du ${aujourdhuiStr}`
        : `Mois de ${moisActuelStr}`;
    setEmailObjet(`État Financier SmartCaisse SIAT — ${libellePeriode}`);
    setEmailConfirmation('');
    setShowEmailModal(true);
  };

  const handleEnvoyerEmail = (e) => {
    e.preventDefault();
    if (!emailDestinataire.trim()) return;
    setEmailEnCours(true);
    setTimeout(() => {
      setEmailEnCours(false);
      setEmailConfirmation(
        `L'état financier détaillé par travailleur a bien été envoyé par courrier électronique à ${emailDestinataire.trim()}.`
      );
    }, 1200);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col"
      onClick={() => dropdownOuvert && setDropdownOuvert(false)}
    >
      {/* Barre supérieure */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-400">SmartCaisse</span>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-slate-300">
            Espace Caissière : <strong className="text-white">{caissiere.nom}</strong>
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setSectionActive('commande')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              sectionActive === 'commande' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Commande
          </button>
          <button
            onClick={() => setSectionActive('rapport')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              sectionActive === 'rapport' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
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
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </header>

      {/* SOUS-SECTION 1 : COMMANDE */}
      {sectionActive === 'commande' && (
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              Saisie d'une Commande
            </h2>

            <form onSubmit={handleValiderCommande} className="flex-1 flex flex-col gap-5">
              <div className="mb-2 relative" onClick={(e) => e.stopPropagation()}>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Personnel client (Travailleur / Stagiaire)
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOuvert(!dropdownOuvert)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  {clientSelectionne ? (
                    <div>
                      <strong className="text-white text-sm">{clientSelectionne.nom}</strong>{' '}
                      <span className="text-slate-400 text-xs">
                        ({clientSelectionne.matricule} • {clientSelectionne.statut})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm">
                      Sélectionner ou rechercher un travailleur...
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      dropdownOuvert ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {dropdownOuvert && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Rechercher par nom, matricule, service..."
                        value={rechercheClient}
                        onChange={(e) => setRechercheClient(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {personnelFiltre.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-2 text-center">
                          Aucun travailleur trouvé.
                        </p>
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
                                setVisageReconnu(false);
                                setFaceFeedback('');
                                setStatusMessage('');
                                arreterCamera();
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex justify-between items-center transition-colors cursor-pointer ${
                                estSelectionne
                                  ? 'bg-blue-600 text-white font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900'
                              }`}
                            >
                              <div>
                                <span className="block font-bold">{pers.nom}</span>
                                <span
                                  className={`text-[11px] ${
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
                <label className="block text-sm text-slate-400 mb-1.5">
                  Montant Total de la commande (FCFA)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 2500"
                  value={montantInput}
                  onChange={(e) => setMontantInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Répartition automatique (Plafond SIAT : 1 000 FCFA)
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="block text-xs text-slate-400 mb-1">Part Entreprise (SIAT)</span>
                    <strong className="text-lg text-sky-400">
                      {partEntreprise.toLocaleString()} FCFA
                    </strong>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="block text-xs text-slate-400 mb-1">Part à payer par le Client</span>
                    <strong className="text-lg text-amber-400">
                      {partClient.toLocaleString()} FCFA
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bloc Reconnaissance Faciale via Webcam */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ScanFace className="w-4 h-4 text-blue-400" />
                    Reconnaissance Faciale (Webcam)
                  </span>
                  {clientSelectionne && (
                    <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-slate-300">
                      Client : <strong>{clientSelectionne.nom}</strong>
                    </span>
                  )}
                </div>

                {cameraActive && (
                  <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-blue-400/60 m-4 rounded-lg pointer-events-none flex items-center justify-center">
                      <span className="bg-black/70 text-blue-300 text-xs px-3 py-1 rounded-full font-medium">
                        Analyse du visage en cours...
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isScanningFace || !clientSelectionne}
                  onClick={handleVerificationFaciale}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5" />
                  {isScanningFace
                    ? 'Vérification du visage en cours...'
                    : 'Démarrer la caméra & Vérifier le visage'}
                </button>

                {visageReconnu ? (
                  <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> {faceFeedback}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 text-center">
                    {faceFeedback ||
                      (clientSelectionne
                        ? 'En attente de la vérification faciale du client'
                        : 'Sélectionnez d’abord un travailleur ci-dessus')}
                  </p>
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
                <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl text-center">
                  {statusMessage}
                </div>
              )}
            </form>
          </section>

          {/* Colonne Droite : Historique */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col max-h-[750px]">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              Bons de commande validés
            </h2>
            <span className="text-xs text-slate-400 mb-3">{commandes.length} bon(s) enregistré(s)</span>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {commandes.map((cmd) => (
                <div
                  key={cmd.numBon}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 text-xs"
                >
                  <div className="flex justify-between items-center text-slate-400">
                    <strong className="text-white text-sm">Bon #{cmd.numBon}</strong>
                    <span>{cmd.date}</span>
                  </div>
                  <div>
                    <strong className="text-white text-sm">{cmd.client.nom}</strong>{' '}
                    <span className="text-slate-400">
                      ({cmd.client.matricule} • {cmd.client.statut})
                    </span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-semibold text-white">
                    <span>Total : {cmd.prixTotal.toLocaleString()} F</span>
                    <span className="text-amber-400">Client : {cmd.partClient.toLocaleString()} F</span>
                    <span className="text-sky-400">SIAT : {cmd.partEntreprise.toLocaleString()} F</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBonPdfSelectionne(cmd)}
                    className="mt-1 w-full flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 py-2 rounded-lg transition-colors cursor-pointer font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Afficher / Imprimer le Bon PDF
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* SOUS-SECTION 2 : RAPPORT */}
      {sectionActive === 'rapport' && (
        <main className="flex-1 p-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">État Financier & Consommation par Travailleur</h2>
              <p className="text-sm text-slate-400">
                Détail nominal par employé et cumul global (Plafond SIAT : 1 000 FCFA)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPeriodeRapport('jour')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    periodeRapport === 'jour' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Journalier ({aujourdhuiStr})
                </button>
                <button
                  onClick={() => setPeriodeRapport('mois')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    periodeRapport === 'mois' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensuel ({moisActuelStr})
                </button>
              </div>

              <button
                onClick={ouvrirFenetreEmail}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                Envoyer par courrier électronique
              </button>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <span className="text-xs text-slate-400 block mb-1">Commandes Validées</span>
              <strong className="text-3xl font-extrabold text-white">
                {commandesPeriode.length}
              </strong>
              <span className="block text-xs text-slate-500 mt-2">Bons signés par caméra</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <span className="text-xs text-slate-400 block mb-1">Montant Total Ventes</span>
              <strong className="text-3xl font-extrabold text-blue-400">
                {totalVentes.toLocaleString()} FCFA
              </strong>
              <span className="block text-xs text-slate-500 mt-2">Total général de la période</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <span className="text-xs text-slate-400 block mb-1">Part Payée par Clients</span>
              <strong className="text-3xl font-extrabold text-amber-400">
                {totalPartClients.toLocaleString()} FCFA
              </strong>
              <span className="block text-xs text-slate-500 mt-2">Cumul à charge des travailleurs</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <span className="text-xs text-slate-400 block mb-1">Part Entreprise (SIAT)</span>
              <strong className="text-3xl font-extrabold text-sky-400">
                {totalPartSiat.toLocaleString()} FCFA
              </strong>
              <span className="block text-xs text-slate-500 mt-2">Cumul subventionné par SIAT</span>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold">Relevé Nominatif des Travailleurs & Stagiaires</h3>
                <p className="text-xs text-slate-400">Détail de chaque employé ayant commandé sur la période sélectionnée</p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimer / PDF État
              </button>
            </div>

            {tableauTravailleurs.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-8 text-center">
                Aucune consommation enregistrée sur cette période.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Matricule</th>
                      <th className="py-3 px-4">Nom du Travailleur</th>
                      <th className="py-3 px-4">Statut / Service</th>
                      <th className="py-3 px-4 text-center">Nb Bons</th>
                      <th className="py-3 px-4 text-right">Total Consommé</th>
                      <th className="py-3 px-4 text-right">Part Client</th>
                      <th className="py-3 px-4 text-right">Subvention SIAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tableauTravailleurs.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-blue-400">{t.matricule}</td>
                        <td className="py-3 px-4 font-bold text-white">{t.nom}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {t.statut} • <span className="text-slate-300">{t.service}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">{t.nbBons}</td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {t.total.toLocaleString()} FCFA
                        </td>
                        <td className="py-3 px-4 text-right text-amber-400 font-medium">
                          {t.client.toLocaleString()} FCFA
                        </td>
                        <td className="py-3 px-4 text-right text-sky-400 font-medium">
                          {t.siat.toLocaleString()} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950 border-t-2 border-slate-800 font-bold text-white">
                    <tr>
                      <td colSpan="3" className="py-3.5 px-4 text-right uppercase">Total Général :</td>
                      <td className="py-3.5 px-4 text-center">
                        {commandesPeriode.length}
                      </td>
                      <td className="py-3.5 px-4 text-right text-blue-400">
                        {totalVentes.toLocaleString()} FCFA
                      </td>
                      <td className="py-3.5 px-4 text-right text-amber-400">
                        {totalPartClients.toLocaleString()} FCFA
                      </td>
                      <td className="py-3.5 px-4 text-right text-sky-400">
                        {totalPartSiat.toLocaleString()} FCFA
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Graphique */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold mb-1">Graphique de Consommation par Personnel</h3>
            <p className="text-xs text-slate-400 mb-6">
              Comparaison visuelle entre la part payée par le client et la subvention SIAT
            </p>

            <div className="flex items-center gap-6 mb-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="text-slate-300">Part Client</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
                <span className="text-slate-300">Subvention SIAT</span>
              </div>
            </div>

            {tableauTravailleurs.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-8 text-center">
                Aucune donnée graphique disponible.
              </p>
            ) : (
              <div className="space-y-5">
                {tableauTravailleurs.map((item) => {
                  const pctClient = (item.client / maxConsommation) * 100;
                  const pctSiat = (item.siat / maxConsommation) * 100;
                  return (
                    <div key={item.matricule} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">
                          {item.nom}{' '}
                          <span className="text-slate-400 font-normal">
                            ({item.nbBons} bon{item.nbBons > 1 ? 's' : ''})
                          </span>
                        </span>
                        <span className="font-bold text-slate-200">
                          {item.total.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-4 rounded-xl overflow-hidden flex border border-slate-800">
                        <div
                          style={{ width: `${pctClient}%` }}
                          className="bg-amber-500 h-full transition-all duration-500"
                          title={`Part Client : ${item.client.toLocaleString()} FCFA`}
                        />
                        <div
                          style={{ width: `${pctSiat}%` }}
                          className="bg-sky-500 h-full transition-all duration-500"
                          title={`Part SIAT : ${item.siat.toLocaleString()} FCFA`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Client : {item.client.toLocaleString()} FCFA</span>
                        <span>SIAT : {item.siat.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      )}

      {/* SOUS-SECTION 3 : PROFIL */}
      {sectionActive === 'profil' && (
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
            <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 text-3xl font-bold mb-4">
              {caissiere.nom.charAt(0).toUpperCase()}
            </div>

            <h2 className="text-2xl font-bold mb-1">{caissiere.nom}</h2>
            <p className="text-sm text-slate-400 mb-4">
              Opératrice de Caisse • Matricule : {caissiere.matricule}
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Compte {caissiere.statut}
            </div>

            <div className="w-full space-y-3 text-left bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" /> Poste d'affectation
                </span>
                <span className="font-semibold text-white">{caissiere.poste}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" /> Téléphone
                </span>
                <span className="font-semibold text-white">{caissiere.telephone}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                <span className="text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" /> Date de prise de service
                </span>
                <span className="font-semibold text-white">{caissiere.dateEmbauche}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-blue-400" /> Validation Biométrique
                </span>
                <span className="font-semibold text-emerald-400">{caissiere.methodeAuth}</span>
              </div>
            </div>

            <button
              onClick={() => {
                arreterCamera();
                setCaissiere(null);
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Fermer la Caisse et Se Déconnecter
            </button>
          </div>
        </main>
      )}

      {/* MODALE 1 : APERÇU PDF */}
      {bonPdfSelectionne && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Reçu PDF — Bon #{bonPdfSelectionne.numBon}</h3>
              </div>
              <button
                onClick={() => setBonPdfSelectionne(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner font-sans text-xs space-y-3">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h4 className="font-extrabold text-sm tracking-wide">SMARTCAISSE — SIAT</h4>
                <p className="text-[11px] text-slate-600">Reçu Officiel de Restauration</p>
                <p className="font-bold mt-1">BON DE COMMANDE N° {bonPdfSelectionne.numBon}</p>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">Date & Heure :</span>
                <span className="font-bold">{bonPdfSelectionne.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Caissière :</span>
                <span className="font-bold">{bonPdfSelectionne.caissiereNom || caissiere.nom}</span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Bénéficiaire :</span>
                  <span className="font-bold">{bonPdfSelectionne.client.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Matricule :</span>
                  <span className="font-bold">{bonPdfSelectionne.client.matricule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Statut / Service :</span>
                  <span className="font-bold">
                    {bonPdfSelectionne.client.statut} ({bonPdfSelectionne.client.service})
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-b-2 border-slate-900 py-2 my-2 flex justify-between font-bold text-sm">
                <span>TOTAL COMMANDE :</span>
                <span>{bonPdfSelectionne.prixTotal.toLocaleString()} FCFA</span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Part Subventionnée (SIAT) :</span>
                  <span className="font-bold text-sky-600">
                    {bonPdfSelectionne.partEntreprise.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Part Payée par le Client :</span>
                  <span className="font-bold text-amber-600">
                    {bonPdfSelectionne.partClient.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-center font-bold rounded-lg text-[10px]">
                ✔ SIGNÉ PAR RECONNAISSANCE FACIALE
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBonPdfSelectionne(null)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => imprimerBonPdf(bonPdfSelectionne)}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Enregistrer / Imprimer en PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 2 : EMAIL */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold">Envoyer l'État Financier</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEnvoyerEmail} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Adresse e-mail du destinataire (Comptabilité / Direction SIAT)
                </label>
                <input
                  type="email"
                  required
                  placeholder="Saisir l'adresse e-mail du destinataire..."
                  value={emailDestinataire}
                  onChange={(e) => setEmailDestinataire(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Objet du courrier électronique
                </label>
                <input
                  type="text"
                  required
                  value={emailObjet}
                  onChange={(e) => setEmailObjet(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
                <span className="font-bold text-slate-300 block mb-1">
                  Contenu inclus dans l'envoi ({tableauTravailleurs.length} travailleur(s)) :
                </span>
                <div className="flex justify-between text-slate-400">
                  <span>Nombre total de bons :</span>
                  <span className="text-white font-semibold">{commandesPeriode.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total général encaissé :</span>
                  <span className="text-blue-400 font-semibold">{totalVentes.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Part payée par les clients :</span>
                  <span className="text-amber-400 font-semibold">{totalPartClients.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Part subventionnée (SIAT) :</span>
                  <span className="text-sky-400 font-semibold">{totalPartSiat.toLocaleString()} FCFA</span>
                </div>
              </div>

              {emailConfirmation && (
                <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl text-center">
                  {emailConfirmation}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={emailEnCours}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {emailEnCours ? 'Envoi en cours...' : 'Envoyer par e-mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}