import { useCallback, useState } from 'react';
import useAdminAuth from '../hooks/useAdminAuth';
import useComptes from '../hooks/useComptes';
import useTravailleurs from '../hooks/useTravailleurs';
import AdminLoginScreen from '../components/AdminLoginScreen';
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';
import ComptesListSection from '../components/ComptesListSection';
import CompteForm from '../components/CompteForm';
import TravailleursSection from '../components/TravailleursSection';
import TravailleurForm from '../components/TravailleurForm';
import DialogModal from '../components/DialogModal';

const DIALOG_FERME = {
  ouvert: false,
  type: 'succes',
  titre: '',
  message: '',
};

export default function AdminPage() {
  const { adminUser, login, logout } = useAdminAuth();
  const [sousPage, setSousPage] = useState('comptes-liste');
  const [editCompte, setEditCompte] = useState(null);
  const [editTravailleur, setEditTravailleur] = useState(null);
  const [dialog, setDialog] = useState(DIALOG_FERME);

  const afficherDialog = useCallback((type, titre, message) => {
    setDialog({ ouvert: true, type, titre, message });
  }, []);

  const gestionComptes = useComptes(afficherDialog);
  const gestionTravailleurs = useTravailleurs(afficherDialog);

  if (!adminUser) {
    return <AdminLoginScreen onLogin={login} />;
  }

  const ouvrirModificationCompte = (compte) => {
    setEditCompte({ ...compte });
    setSousPage('comptes-modifier');
  };

  const handleCreerCompte = (values) => {
    if (gestionComptes.creerCompte(values)) setSousPage('comptes-liste');
  };

  const handleModifierCompte = (values) => {
    if (gestionComptes.modifierCompte(values)) setSousPage('comptes-liste');
  };

  const ouvrirModificationTravailleur = (trav) => {
    setEditTravailleur({ ...trav });
    setSousPage('travailleurs-modifier');
  };

  const handleAjouterTravailleur = (values) => {
    gestionTravailleurs.ajouterTravailleur(values);
  };

  const handleModifierTravailleur = (values) => {
    if (gestionTravailleurs.modifierTravailleur(values)) setSousPage('travailleurs');
  };

  const comptes = gestionComptes.comptes;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <AdminHeader adminUser={adminUser} onLogout={logout} />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar sousPage={sousPage} onChangeSousPage={setSousPage} />

        <main className="flex-1 p-6 overflow-y-auto">
          {sousPage === 'comptes-liste' && (
            <ComptesListSection
              comptes={gestionComptes.comptesFiltres}
              totaux={{
                actifs: comptes.filter((c) => c.statut === 'actif').length,
                suspendus: comptes.filter((c) => c.statut === 'suspendu').length,
                tous: comptes.length,
              }}
              filtreStatut={gestionComptes.filtreStatut}
              onChangerFiltre={gestionComptes.setFiltreStatut}
              onModifier={ouvrirModificationCompte}
              onSupprimer={gestionComptes.supprimerCompte}
            />
          )}

          {sousPage === 'comptes-creer' && (
            <CompteForm
              onSoumettre={handleCreerCompte}
              onAnnuler={() => setSousPage('comptes-liste')}
            />
          )}

          {sousPage === 'comptes-modifier' && editCompte && (
            <CompteForm
              compte={editCompte}
              onSoumettre={handleModifierCompte}
              onAnnuler={() => setSousPage('comptes-liste')}
            />
          )}

          {sousPage === 'travailleurs' && (
            <TravailleursSection
              travailleurs={gestionTravailleurs.travailleurs}
              onAjouter={handleAjouterTravailleur}
              onModifier={ouvrirModificationTravailleur}
              onSupprimer={gestionTravailleurs.supprimerTravailleur}
            />
          )}

          {sousPage === 'travailleurs-modifier' && editTravailleur && (
            <TravailleurForm
              travailleur={editTravailleur}
              onSoumettre={handleModifierTravailleur}
              onAnnuler={() => setSousPage('travailleurs')}
            />
          )}
        </main>
      </div>

      <DialogModal
        dialog={dialog}
        onClose={() => setDialog({ ...dialog, ouvert: false })}
      />
    </div>
  );
}
