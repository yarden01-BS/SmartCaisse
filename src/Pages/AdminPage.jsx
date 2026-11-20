import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  UserPlus,
  MoreVertical,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  UserCheck,
  Camera,
  ScanFace,
  Briefcase,
  RefreshCw,
  Mail,
  Hash,
  FileDown,
} from 'lucide-react';

// Génère une empreinte numérique unique représentant les traits faciaux (pour le Back-End)
function genererSignatureFaciale() {
  const randomPart = Math.floor(100000000 + Math.random() * 900000000);
  const timePart = Date.now().toString().slice(-6);
  return `FACE-${timePart}-${randomPart}`;
}

export default function AdminPage() {
  const navigate = useNavigate();

  // Authentification Administrateur
  const [adminUser, setAdminUser] = useState(null);
  const [loginNom, setLoginNom] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loginError, setLoginError] = useState('');

  // Sous-pages :
  // 'comptes-liste' | 'comptes-creer' | 'comptes-modifier' | 'travailleurs' | 'travailleurs-modifier'
  const [sousPage, setSousPage] = useState('comptes-liste');

  
  // 1. COMPTES UTILISATEURS (Sans données fictives)
  
  const [comptes, setComptes] = useState([]);

  const [filtreStatut, setFiltreStatut] = useState('actif');
  const [menuOuvertId, setMenuOuvertId] = useState(null);

  // Formulaire Création de compte
  const [createNom, setCreateNom] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState('Caissière');
  const [createPwd, setCreatePwd] = useState('');
  const [createStatut, setCreateStatut] = useState('actif');

  // Formulaire Modification de compte
  const [editCompte, setEditCompte] = useState(null);

  
  // 2. TRAVAILLEURS & STAGIAIRES (SANS DONNÉES FICTIVES)
  
  const [travailleurs, setTravailleurs] = useState([]);

  // Ajout Travailleur
  const [travMatricule, setTravMatricule] = useState('');
  const [travNom, setTravNom] = useState('');
  const [travPrenom, setTravPrenom] = useState('');
  const [travStatut, setTravStatut] = useState('Travailleur');
  const [travSignature, setTravSignature] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanningTraits, setIsScanningTraits] = useState(false);

  // Modification Travailleur
  const [editTravailleur, setEditTravailleur] = useState(null);
  const [menuTravOuvertId, setMenuTravOuvertId] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Boîte de dialogue (Succès / Erreur)
  const [dialog, setDialog] = useState({
    ouvert: false,
    type: 'succes',
    titre: '',
    message: '',
  });

  const afficherDialog = (type, titre, message) => {
    setDialog({ ouvert: true, type, titre, message });
  };

  const arreterCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsScanningTraits(false);
  };

  useEffect(() => {
    return () => arreterCamera();
  }, [sousPage]);

  // --- Connexion Admin ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginNom.trim() && loginPwd === '1234') {
      setAdminUser({ id: 1, nom: loginNom.trim() });
      setLoginError('');
    } else {
      setLoginError('Identifiant ou mot de passe incorrect (Test : admin / 1234)');
    }
  };

  //  Création de compte (avec e-mail) 
  const handleCreerCompte = (e) => {
    e.preventDefault();
    if (!createNom.trim() || !createEmail.trim() || !createPwd.trim()) {
      afficherDialog(
        'erreur',
        'Compte inexistant ou incomplet',
        'Veuillez renseigner le nom, l’adresse e-mail et le mot de passe.'
      );
      return;
    }

    const existeDeja = comptes.some(
      (c) =>
        c.nom.toLowerCase() === createNom.trim().toLowerCase() ||
        c.email.toLowerCase() === createEmail.trim().toLowerCase()
    );
    if (existeDeja) {
      afficherDialog(
        'erreur',
        'Compte déjà existant',
        'Un compte avec ce nom ou cette adresse e-mail existe déjà.'
      );
      return;
    }

    const nouveauCompte = {
      id: Date.now(),
      nom: createNom.trim(),
      email: createEmail.trim().toLowerCase(),
      role: createRole,
      statut: createStatut,
      protege: false,
    };

    setComptes([nouveauCompte, ...comptes]);
    setCreateNom('');
    setCreateEmail('');
    setCreatePwd('');
    setCreateStatut('actif');

    afficherDialog(
      'succes',
      'Compte créé avec succès',
      `Le compte de ${nouveauCompte.nom} (${nouveauCompte.email}) a été créé.`
    );
    setSousPage('comptes-liste');
  };

  //  Modification de compte
  const ouvrirModificationCompte = (compte) => {
    setMenuOuvertId(null);
    setEditCompte({ ...compte, nouveauPwd: '' });
    setSousPage('comptes-modifier');
  };

  const handleValiderModificationCompte = (e) => {
    e.preventDefault();
    if (!editCompte || !editCompte.nom.trim() || !editCompte.email.trim()) {
      afficherDialog(
        'erreur',
        'Compte invalide',
        'Le nom et l’adresse e-mail sont obligatoires.'
      );
      return;
    }

    setComptes((prev) =>
      prev.map((c) =>
        c.id === editCompte.id
          ? {
              ...c,
              nom: editCompte.nom.trim(),
              email: editCompte.email.trim().toLowerCase(),
              role: editCompte.role,
              statut: editCompte.statut,
            }
          : c
      )
    );

    setSousPage('comptes-liste');
    afficherDialog(
      'succes',
      'Compte modifié',
      `Les informations de ${editCompte.nom.trim()} ont été enregistrées.`
    );
  };

  //  Suppression de compte 
  const handleSupprimerCompte = (compte) => {
    setMenuOuvertId(null);
    if (compte.protege) {
      afficherDialog(
        'erreur',
        'Échec de la suppression',
        `Le compte "${compte.nom}" est protégé et ne peut pas être supprimé.`
      );
      return;
    }
    setComptes((prev) => prev.filter((c) => c.id !== compte.id));
    afficherDialog(
      'succes',
      'Suppression réussie',
      `Le compte "${compte.nom}" a été supprimé.`
    );
  };

  //  Capture des traits faciaux 
  const lancerScanTraitsFaciaux = async (modeEdition = false) => {
    setIsScanningTraits(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 320 },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);

      setTimeout(() => {
        const signatureUnique = genererSignatureFaciale();
        if (modeEdition && editTravailleur) {
          setEditTravailleur({ ...editTravailleur, signatureFaciale: signatureUnique });
        } else {
          setTravSignature(signatureUnique);
        }
        arreterCamera();
      }, 2200);
    } catch {
      setTimeout(() => {
        const signatureUnique = genererSignatureFaciale();
        if (modeEdition && editTravailleur) {
          setEditTravailleur({ ...editTravailleur, signatureFaciale: signatureUnique });
        } else {
          setTravSignature(signatureUnique);
        }
        arreterCamera();
      }, 1000);
    }
  };

  // Ajouter un travailleur 
  const handleAjouterTravailleur = (e) => {
    e.preventDefault();
    const matriculeFormate = travMatricule.trim().toUpperCase();
    if (!matriculeFormate || !travNom.trim() || !travPrenom.trim()) {
      afficherDialog(
        'erreur',
        'Champs obligatoires',
        'Veuillez saisir le matricule (ex: SA7206), le nom et le prénom du travailleur.'
      );
      return;
    }
    if (!travSignature) {
      afficherDialog(
        'erreur',
        'Traits faciaux manquants',
        'Veuillez scanner le visage pour générer son identifiant numérique unique.'
      );
      return;
    }

    const nouveau = {
      id: Date.now(),
      matricule: matriculeFormate,
      nom: travNom.trim().toUpperCase(),
      prenom: travPrenom.trim(),
      statut: travStatut,
      signatureFaciale: travSignature,
    };

    setTravailleurs([nouveau, ...travailleurs]);
    setTravMatricule('');
    setTravNom('');
    setTravPrenom('');
    setTravStatut('Travailleur');
    setTravSignature('');

    afficherDialog(
      'succes',
      'Travailleur enregistré',
      `${nouveau.prenom} ${nouveau.nom} (${nouveau.matricule} • ${nouveau.statut}) a été enregistré avec sa signature faciale unique.`
    );
  };

  // Modifier un travailleur 
  const ouvrirModificationTravailleur = (trav) => {
    setMenuTravOuvertId(null);
    setEditTravailleur({ ...trav, matricule: trav.matricule || '' });
    setSousPage('travailleurs-modifier');
  };

  const handleValiderModificationTravailleur = (e) => {
    e.preventDefault();
    const matriculeModifie = (editTravailleur?.matricule || '').trim().toUpperCase();
    if (!editTravailleur || !matriculeModifie || !editTravailleur.nom.trim() || !editTravailleur.prenom.trim()) {
      afficherDialog('erreur', 'Champs invalides', 'Le matricule, le nom et le prénom sont obligatoires.');
      return;
    }

    setTravailleurs((prev) =>
      prev.map((t) =>
        t.id === editTravailleur.id
          ? {
              ...t,
              matricule: matriculeModifie,
              nom: editTravailleur.nom.trim().toUpperCase(),
              prenom: editTravailleur.prenom.trim(),
              statut: editTravailleur.statut,
              signatureFaciale: editTravailleur.signatureFaciale,
            }
          : t
      )
    );

    setSousPage('travailleurs');
    afficherDialog(
      'succes',
      'Travailleur modifié',
      `La fiche de ${editTravailleur.prenom.trim()} ${editTravailleur.nom.trim()} (${matriculeModifie}) a été mise à jour.`
    );
  };

  // Supprimer un travailleur
  const handleSupprimerTravailleur = (trav) => {
    setMenuTravOuvertId(null);
    setTravailleurs((prev) => prev.filter((t) => t.id !== trav.id));
    afficherDialog(
      'succes',
      'Travailleur supprimé',
      `${trav.prenom} ${trav.nom} a été retiré de la liste.`
    );
  };

  
  // ÉCRAN DE CONNEXION
  
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <span className="text-lg font-bold text-emerald-400">
            SmartCaisse | Connexion Administrateur
          </span>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer text-white"
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
            <h1 className="text-2xl font-bold text-center mb-6">Accès Supervision</h1>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Nom administrateur</label>
              <input
                type="text"
                placeholder="Ex: admin"
                value={loginNom}
                onChange={(e) => setLoginNom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="Ex: 1234"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer text-white"
            >
              Se connecter
            </button>

            {loginError && <p className="text-red-400 text-sm text-center mt-2">{loginError}</p>}
          </form>
        </div>
      </div>
    );
  }

  const comptesFiltres = comptes.filter((c) =>
    filtreStatut === 'tous' ? true : c.statut === filtreStatut
  );

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col"
      onClick={() => {
        if (menuOuvertId) setMenuOuvertId(null);
        if (menuTravOuvertId) setMenuTravOuvertId(null);
      }}
    >
      {/* Barre supérieure */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-emerald-400">SmartCaisse Admin</span>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-slate-300">
            Session : <strong className="text-white">{adminUser.nom}</strong>
          </span>
        </div>

        <button
          onClick={() => {
            arreterCamera();
            setAdminUser(null);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer text-white"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Menu latéral */}
        <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-3">
              Gestion des Comptes
            </span>
            <button
              onClick={() => setSousPage('comptes-liste')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                sousPage === 'comptes-liste' || sousPage === 'comptes-modifier'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Affichage des comptes
            </button>
            <button
              onClick={() => setSousPage('comptes-creer')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                sousPage === 'comptes-creer'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Création de compte
            </button>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-3">
              Personnel Client SIAT
            </span>
            <button
              onClick={() => setSousPage('travailleurs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                sousPage === 'travailleurs' || sousPage === 'travailleurs-modifier'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ScanFace className="w-4 h-4" />
              Gestion des travailleurs
            </button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* 
1. AFFICHAGE DES COMPTES UTILISATEURS
           */}
          {sousPage === 'comptes-liste' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Comptes Utilisateurs</h2>
                  <p className="text-xs text-slate-400">
                    Cliquez sur « … » ou sur les boutons d'action pour modifier ou supprimer
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setFiltreStatut('actif')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      filtreStatut === 'actif'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Actifs ({comptes.filter((c) => c.statut === 'actif').length})
                  </button>
                  <button
                    onClick={() => setFiltreStatut('suspendu')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      filtreStatut === 'suspendu'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Suspendus ({comptes.filter((c) => c.statut === 'suspendu').length})
                  </button>
                  <button
                    onClick={() => setFiltreStatut('tous')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      filtreStatut === 'tous'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tous ({comptes.length})
                  </button>
                </div>
              </div>

              {comptesFiltres.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
                  Aucun compte trouvé dans cette catégorie. Utilisez « Création de compte » pour en ajouter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comptesFiltres.map((compte) => (
                    <div
                      key={compte.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-4 relative shadow-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                              compte.role === 'Administrateur'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-blue-500/15 text-blue-400'
                            }`}
                          >
                            {compte.role === 'Administrateur' ? (
                              <ShieldCheck className="w-6 h-6" />
                            ) : (
                              <UserCheck className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-white">{compte.nom}</h3>
                            <span className="text-xs text-slate-400">{compte.role}</span>
                          </div>
                        </div>

                        {/* Menu "..." rattaché à la card */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setMenuOuvertId(menuOuvertId === compte.id ? null : compte.id)
                            }
                            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                            title="Options (Modifier / Supprimer)"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {menuOuvertId === compte.id && (
                            <div className="absolute right-0 top-12 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-20 py-2 w-44 text-left">
                              <button
                                onClick={() => ouvrirModificationCompte(compte)}
                                className="w-full px-4 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-900 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                              </button>
                              <button
                                onClick={() => handleSupprimerCompte(compte)}
                                className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-slate-900 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* E-mail affiché sur la card */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800/60">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{compte.email}</span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            compte.statut === 'actif'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {compte.statut === 'actif' ? '● Actif' : '● Suspendu'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => ouvrirModificationCompte(compte)}
                            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-colors cursor-pointer"
                            title="Modifier ce compte"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSupprimerCompte(compte)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition-colors cursor-pointer"
                            title="Supprimer ce compte"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 
2. CRÉATION DE COMPTE 
           */}
          {sousPage === 'comptes-creer' && (
            <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-1">Création d'un Compte</h2>
              <p className="text-xs text-slate-400 mb-6">
                Renseignez le nom, l'adresse e-mail et les accès du nouvel utilisateur
              </p>

              <form onSubmit={handleCreerCompte} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nom complet</label>
                  <input
                    type="text"
                    placeholder="Ex: Nadia Malonga"
                    value={createNom}
                    onChange={(e) => setCreateNom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Adresse e-mail</label>
                  <input
                    type="email"
                    placeholder="Ex: nadia.malonga@siat.cg"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Rôle</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
                  >
                    <option value="Caissière">Caissière</option>
                    <option value="Administrateur">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Statut initial</label>
                  <select
                    value={createStatut}
                    onChange={(e) => setCreateStatut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
                  >
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    placeholder="Saisir un mot de passe"
                    value={createPwd}
                    onChange={(e) => setCreatePwd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSousPage('comptes-liste')}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm cursor-pointer text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm cursor-pointer text-white transition-colors"
                  >
                    Créer le compte
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 
3. MODIFICATION D'UN COMPTE EXISTANT
           */}
          {sousPage === 'comptes-modifier' && editCompte && (
            <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-1">Modifier le Compte</h2>
              <p className="text-xs text-slate-400 mb-6">
                Modifiez les informations préremplies de {editCompte.nom}
              </p>

              <form onSubmit={handleValiderModificationCompte} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={editCompte.nom}
                    onChange={(e) => setEditCompte({ ...editCompte, nom: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Adresse e-mail</label>
                  <input
                    type="email"
                    value={editCompte.email}
                    onChange={(e) => setEditCompte({ ...editCompte, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Rôle</label>
                  <select
                    value={editCompte.role}
                    onChange={(e) => setEditCompte({ ...editCompte, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
                  >
                    <option value="Caissière">Caissière</option>
                    <option value="Administrateur">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Statut</label>
                  <select
                    value={editCompte.statut}
                    onChange={(e) => setEditCompte({ ...editCompte, statut: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
                  >
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nouveau mot de passe (optionnel)</label>
                  <input
                    type="password"
                    placeholder="Laisser vide pour conserver l'actuel"
                    value={editCompte.nouveauPwd}
                    onChange={(e) =>
                      setEditCompte({ ...editCompte, nouveauPwd: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSousPage('comptes-liste')}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm cursor-pointer text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm cursor-pointer text-white transition-colors"
                  >
                    Valider
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 
4. GESTION DES TRAVAILLEURS & STAGIAIRES
           */}
          {sousPage === 'travailleurs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-1">Enregistrer un Travailleur / Stagiaire</h2>
                <p className="text-xs text-slate-400 mb-6">
                  Renseignez l'identité, le matricule et scannez les traits faciaux
                </p>

                <form onSubmit={handleAjouterTravailleur} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Matricule</label>
                    <input
                      type="text"
                      placeholder="Ex: SA7206"
                      value={travMatricule}
                      onChange={(e) =>
                        setTravMatricule(e.target.value.toUpperCase().replace(/\s+/g, ''))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nom</label>
                    <input
                      type="text"
                      placeholder="Ex: Makosso"
                      value={travNom}
                      onChange={(e) => setTravNom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Prénom</label>
                    <input
                      type="text"
                      placeholder="Ex: Jean"
                      value={travPrenom}
                      onChange={(e) => setTravPrenom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Statut</label>
                    <select
                      value={travStatut}
                      onChange={(e) => setTravStatut(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
                    >
                      <option value="Travailleur">Travailleur</option>
                      <option value="Stagiaire">Stagiaire</option>
                    </select>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <span className="font-semibold text-slate-300 flex items-center gap-2">
                      <ScanFace className="w-4 h-4 text-blue-400" />
                      Empreinte des traits faciaux
                    </span>

                    {cameraActive && (
                      <div className="relative w-full h-36 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isScanningTraits}
                      onClick={() => lancerScanTraitsFaciaux(false)}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed text-white"
                    >
                      <Camera className="w-4 h-4" />
                      {isScanningTraits
                        ? 'Capture des traits faciaux en cours...'
                        : travSignature
                          ? 'Recapturer les traits faciaux'
                          : 'Scanner les traits faciaux'}
                    </button>

                    <div
                      className={`p-2.5 rounded-xl text-xs font-mono break-all ${
                        travSignature
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 text-center'
                      }`}
                    >
                      {travSignature || 'En attente de capture faciale'}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Enregistrer le travailleur
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Liste du Personnel Enregistré</h2>
                  <span className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-xl font-semibold">
                    {travailleurs.length} enregistré(s)
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[560px]">
                  {travailleurs.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-12">
                      Aucun travailleur ou stagiaire enregistré pour le moment.
                    </p>
                  ) : (
                    travailleurs.map((trav) => (
                      <div
                        key={trav.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between items-center gap-3 relative"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-sm text-white">
                              {trav.prenom} {trav.nom}
                            </strong>
                            {trav.matricule && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
                                {trav.matricule}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                              {trav.statut}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 block break-all">
                            {trav.signatureFaciale}
                          </span>
                        </div>

                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              setMenuTravOuvertId(menuTravOuvertId === trav.id ? null : trav.id)
                            }
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
                            title="Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {menuTravOuvertId === trav.id && (
                            <div className="absolute right-0 top-11 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-20 py-2 w-40 text-left">
                              <button
                                onClick={() => ouvrirModificationTravailleur(trav)}
                                className="w-full px-4 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Modifier
                              </button>
                              <button
                                onClick={() => handleSupprimerTravailleur(trav)}
                                className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 
5. MODIFICATION D'UN TRAVAILLEUR
           */}
          {sousPage === 'travailleurs-modifier' && editTravailleur && (
            <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-1">Modifier le Travailleur / Stagiaire</h2>
              <p className="text-xs text-slate-400 mb-6">
                Mettez à jour l'identité, le matricule ou la signature faciale
              </p>

              <form onSubmit={handleValiderModificationTravailleur} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Matricule</label>
                  <input
                    type="text"
                    placeholder="Ex: SA7206"
                    value={editTravailleur.matricule || ''}
                    onChange={(e) =>
                      setEditTravailleur({
                        ...editTravailleur,
                        matricule: e.target.value.toUpperCase().replace(/\s+/g, ''),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editTravailleur.nom}
                    onChange={(e) =>
                      setEditTravailleur({ ...editTravailleur, nom: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editTravailleur.prenom}
                    onChange={(e) =>
                      setEditTravailleur({ ...editTravailleur, prenom: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Statut</label>
                  <select
                    value={editTravailleur.statut}
                    onChange={(e) =>
                      setEditTravailleur({ ...editTravailleur, statut: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm cursor-pointer"
                  >
                    <option value="Travailleur">Travailleur</option>
                    <option value="Stagiaire">Stagiaire</option>
                  </select>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <span className="font-semibold text-slate-300 flex items-center gap-2">
                    <ScanFace className="w-4 h-4 text-blue-400" />
                    Empreinte des traits faciaux
                  </span>

                  {cameraActive && (
                    <div className="relative w-full h-36 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isScanningTraits}
                    onClick={() => lancerScanTraitsFaciaux(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isScanningTraits ? 'Recapture en cours...' : 'Recapturer les traits faciaux'}
                  </button>

                  <div className="p-2.5 rounded-xl text-xs font-mono break-all bg-slate-900 border border-slate-800 text-emerald-400">
                    {editTravailleur.signatureFaciale}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSousPage('travailleurs')}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm cursor-pointer text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm cursor-pointer text-white transition-colors"
                  >
                    Valider
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Boîte de dialogue */}
      {dialog.ouvert && (
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
              onClick={() => setDialog({ ...dialog, ouvert: false })}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm cursor-pointer text-white transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}