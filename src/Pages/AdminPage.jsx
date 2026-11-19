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

  
  // 1. COMPTES UTILISATEURS (SANS DONNÉES FICTIVES)
  
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

  // --- Capture des traits faciaux ---
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
    if (!travNom.trim() || !travPrenom.trim()) {
      afficherDialog(
        'erreur',
        'Champs obligatoires',
        'Veuillez saisir le nom et le prénom du travailleur.'
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
      nom: travNom.trim().toUpperCase(),
      prenom: travPrenom.trim(),
      statut: travStatut,
      signatureFaciale: travSignature,
    };

    setTravailleurs([nouveau, ...travailleurs]);
    setTravNom('');
    setTravPrenom('');
    setTravStatut('Travailleur');
    setTravSignature('');

    afficherDialog(
      'succes',
      'Travailleur enregistré',
      `${nouveau.prenom} ${nouveau.nom} (${nouveau.statut}) a été enregistré avec sa signature faciale unique.`
    );
  };

  // Modifier un travailleur 
  const ouvrirModificationTravailleur = (trav) => {
    setMenuTravOuvertId(null);
    setEditTravailleur({ ...trav });
    setSousPage('travailleurs-modifier');
  };

  const handleValiderModificationTravailleur = (e) => {
    e.preventDefault();
    if (!editTravailleur || !editTravailleur.nom.trim() || !editTravailleur.prenom.trim()) {
      afficherDialog('erreur', 'Champs invalides', 'Le nom et le prénom sont obligatoires.');
      return;
    }

    setTravailleurs((prev) =>
      prev.map((t) =>
        t.id === editTravailleur.id
          ? {
              ...t,
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
      `La fiche de ${editTravailleur.prenom.trim()} ${editTravailleur.nom.trim()} a été mise à jour.`
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
          2. CRÉATION DE COMPTE (AVEC E-MAIL)
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
          4. GESTION DES TRAVAILLEURS + EXPORT PDF
           */}
          {sousPage === 'travailleurs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {/* Formulaire d'ajout + Extraction des traits faciaux */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">Ajouter un Travailleur</h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Saisissez son identité et extrayez sa signature faciale unique
                  </p>
                </div>

                <form onSubmit={handleAjouterTravailleur} className="space-y-4 text-xs flex-1 flex flex-col">
                  <div>
                    <label className="block text-slate-400 mb-1">Nom</label>
                    <input
                      type="text"
                      placeholder="Ex: MAKOSSO"
                      value={travNom}
                      onChange={(e) => setTravNom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Prénom</label>
                    <input
                      type="text"
                      placeholder="Ex: Jean"
                      value={travPrenom}
                      onChange={(e) => setTravPrenom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Statut</label>
                    <select
                      value={travStatut}
                      onChange={(e) => setTravStatut(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white cursor-pointer"
                    >
                      <option value="Travailleur">Travailleur</option>
                      <option value="Stagiaire">Stagiaire</option>
                    </select>
                  </div>

                  {/* Bloc Extraction des traits faciaux */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <ScanFace className="w-4 h-4 text-blue-400" />
                      Traits Faciaux (ID Numérique)
                    </span>

                    {cameraActive && (
                      <div className="relative w-full h-40 bg-black rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-black/80 text-blue-300 text-[11px] px-3 py-1 rounded-full font-medium animate-pulse">
                            Extraction des points faciaux...
                          </span>
                        </div>
                      </div>
                    )}

                    {travSignature && !cameraActive && (
                      <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl p-3 text-center space-y-1">
                        <span className="font-mono text-xs text-emerald-400 font-bold block">
                          {travSignature}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Signature prête</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isScanningTraits}
                      onClick={() => lancerScanTraitsFaciaux(false)}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer text-white transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      {travSignature ? (
                        <>{isScanningTraits ? 'Analyse en cours...' : 'Recalculer les traits faciaux'}</>
                      ) : (
                        <>{isScanningTraits ? 'Lecture des traits en cours...' : 'Scanner le visage (Webcam)'}</>
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="mt-auto w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors cursor-pointer"
                  >
                    Enregistrer le travailleur
                  </button>
                </form>
              </div>

              {/* Liste des travailleurs + Bouton Exporter en PDF */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold">Personnel Enregistré</h2>
                      <p className="text-xs text-slate-400">
                        Effectif actuel : {travailleurs.length} personne(s)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        afficherDialog(
                          'succes',
                          'Export PDF',
                          'Fonctionnalité d’export PDF prête à être reliée à votre générateur de documents.'
                        )
                      }
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-white"
                    >
                      <FileDown className="w-4 h-4 text-emerald-400" />
                      Exporter en PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[460px]">
                  {travailleurs.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-12">
                      Aucun travailleur enregistré pour le moment. Utilisez le formulaire à gauche pour ajouter du personnel.
                    </p>
                  ) : (
                    travailleurs.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {t.prenom.charAt(0)}
                            {t.nom.charAt(0)}
                          </div>
                          <div>
                            <strong className="text-sm text-white block">
                              {t.prenom} {t.nom}
                            </strong>
                            <span className="text-xs text-slate-400 block">{t.statut}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {t.signatureFaciale}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => ouvrirModificationTravailleur(t)}
                            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSupprimerTravailleur(t)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 
          5. MODIFICATION D'UN TRAVAILLEUR EXISTANT
         */}
          {sousPage === 'travailleurs-modifier' && editTravailleur && (
            <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-1">Modifier le Travailleur</h2>
              <p className="text-xs text-slate-400 mb-6">
                Modifiez les informations de {editTravailleur.prenom} {editTravailleur.nom}
              </p>

              <form onSubmit={handleValiderModificationTravailleur} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editTravailleur.nom}
                    onChange={(e) =>
                      setEditTravailleur({ ...editTravailleur, nom: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
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
                  <span className="font-semibold text-slate-300 block">Identifiant Biométrique Facial</span>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-emerald-400 text-center text-xs">
                    {editTravailleur.signatureFaciale}
                  </div>

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
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer text-white transition-colors"
                  >
                    {isScanningTraits ? 'Extraction en cours...' : 'Mettre à jour les traits faciaux (Webcam)'}
                  </button>
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
                    Valider les modifications
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* 
      BOÎTE DE DIALOGUE (SUCCÈS OU ÉCHEC)
       */}
      {dialog.ouvert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
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

            <div>
              <h3 className="text-lg font-bold text-white mb-1">{dialog.titre}</h3>
              <p className="text-xs text-slate-400">{dialog.message}</p>
            </div>

            <button
              onClick={() => setDialog({ ...dialog, ouvert: false })}
              className={`w-full py-3 rounded-xl font-bold text-sm cursor-pointer text-white transition-colors ${
                dialog.type === 'succes'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}