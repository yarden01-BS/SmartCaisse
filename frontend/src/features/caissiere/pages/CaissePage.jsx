import { useEffect, useState } from 'react';
import useCommandes from '../hooks/useCommandes';
import { getBeneficiaires, logout, restoreSession } from '../api';
import LoginScreen from '../components/LoginScreen';
import CaisseHeader from '../components/CaisseHeader';
import CommandeSection from '../components/CommandeSection';
import RapportSection from '../components/RapportSection';
import ProfilSection from '../components/ProfilSection';
import BonPdfModal from '../components/BonPdfModal';

export default function CaissePage() {
  const [caissiere, setCaissiere] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [section, setSection] = useState('commande'); // 'commande' | 'rapport' | 'profil'
  const [bonPdf, setBonPdf] = useState(null);
  const [personnel, setPersonnel] = useState([]);
  const [erreurPersonnel, setErreurPersonnel] = useState('');
  const {
    commandes,
    chargement: chargementCommandes,
    erreur: erreurCommandes,
    ajouterCommande,
  } = useCommandes(Boolean(caissiere));

  useEffect(() => {
    if (!caissiere) return undefined;
    let actif = true;

    getBeneficiaires()
      .then((liste) => {
        if (actif) setPersonnel(liste);
      })
      .catch((error) => {
        if (actif) setErreurPersonnel(error.message);
      });

    return () => {
      actif = false;
    };
  }, [caissiere]);

  useEffect(() => {
    let actif = true;

    restoreSession()
      .then((utilisateur) => {
        if (actif) setCaissiere(utilisateur);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });

    return () => {
      actif = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setCaissiere(null);
    }
  };

  if (chargement) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Vérification de la session...
      </div>
    );
  }

  if (!caissiere) {
    return <LoginScreen onLogin={setCaissiere} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <CaisseHeader
        caissiere={caissiere}
        sectionActive={section}
        onChangeSection={setSection}
        onLogout={handleLogout}
      />

      {section === 'commande' && (
        <CommandeSection
          personnel={personnel}
          commandes={commandes}
          chargement={chargementCommandes}
          erreur={erreurCommandes}
          erreurPersonnel={erreurPersonnel}
          onAjouterCommande={ajouterCommande}
          onOuvrirBon={setBonPdf}
        />
      )}
      {section === 'rapport' && <RapportSection />}
      {section === 'profil' && (
        <ProfilSection caissiere={caissiere} onLogout={handleLogout} />
      )}

      {bonPdf && (
        <BonPdfModal
          bon={bonPdf}
          caissiereNom={caissiere.nom}
          onClose={() => setBonPdf(null)}
        />
      )}
    </div>
  );
}
