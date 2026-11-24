import { useCallback, useState } from 'react';
import useAdminAuth from '../hooks/useAdminAuth';
import useComptes from '../hooks/useComptes';
import useBeneficiaires from '../hooks/useTravailleurs';
import AdminLoginScreen from '../components/AdminLoginScreen';
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';
import ComptesListSection from '../components/ComptesListSection';
import CompteForm from '../components/CompteForm';
import BeneficiairesListe from '../components/TravailleursSection';
import BeneficiaireForm from '../components/TravailleurForm';
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
  const [editBeneficiaire, setEditBeneficiaire] = useState(null);
  const [dialog, setDialog] = useState(DIALOG_FERME);

  const afficherDialog = useCallback((type, titre, message) => {
    setDialog({ ouvert: true, type, titre, message });
  }, []);

  const gestionComptes = useComptes(afficherDialog);
  const gestionBeneficiaires = useBeneficiaires(afficherDialog);

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

  const ouvrirModificationBeneficiaire = (beneficiaire) => {
    setEditBeneficiaire({ ...beneficiaire });
    setSousPage('beneficiaires-modifier');
  };

  const handleAjouterBeneficiaire = (values) => {
    if (gestionBeneficiaires.ajouterBeneficiaire(values)) {
      setSousPage('beneficiaires-liste');
    }
  };

  const handleModifierBeneficiaire = (values) => {
    if (gestionBeneficiaires.modifierBeneficiaire(values)) {
      setSousPage('beneficiaires-liste');
    }
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

          {sousPage === 'beneficiaires-creer' && (
            <div className="max-w-3xl mx-auto">
              <BeneficiaireForm
                onSoumettre={handleAjouterBeneficiaire}
                onAnnuler={() => setSousPage('beneficiaires-liste')}
              />
            </div>
          )}

          {sousPage === 'beneficiaires-liste' && (
            <BeneficiairesListe
              beneficiaires={gestionBeneficiaires.beneficiaires}
              onAjouter={() => setSousPage('beneficiaires-creer')}
              onModifier={ouvrirModificationBeneficiaire}
              onSupprimer={gestionBeneficiaires.supprimerBeneficiaire}
            />
          )}

          {sousPage === 'beneficiaires-modifier' && editBeneficiaire && (
            <div className="max-w-3xl mx-auto">
              <BeneficiaireForm
                beneficiaire={editBeneficiaire}
                onSoumettre={handleModifierBeneficiaire}
                onAnnuler={() => setSousPage('beneficiaires-liste')}
              />
            </div>
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
