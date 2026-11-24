import { useState } from "react";
import useCommandes from "../hooks/useCommandes";
import { personnelMock } from "../mockData";
import LoginScreen from "../components/LoginScreen";
import CaisseHeader from "../components/CaisseHeader";
import CommandeSection from "../components/CommandeSection";
import RapportSection from "../components/RapportSection";
import ProfilSection from "../components/ProfilSection";
import BonPdfModal from "../components/BonPdfModal";

export default function CaissePage() {
  const [caissiere, setCaissiere] = useState(null);
  const [section, setSection] = useState("commande"); // 'commande' | 'rapport' | 'profil'
  const [bonPdf, setBonPdf] = useState(null);
  const { commandes, ajouterCommande } = useCommandes();

  if (!caissiere) {
    return <LoginScreen onLogin={setCaissiere} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <CaisseHeader
        caissiere={caissiere}
        sectionActive={section}
        onChangeSection={setSection}
        onLogout={() => setCaissiere(null)}
      />

      {section === "commande" && (
        <CommandeSection
          personnel={personnelMock}
          commandes={commandes}
          caissiereNom={caissiere.nom}
          onAjouterCommande={ajouterCommande}
          onOuvrirBon={setBonPdf}
        />
      )}
      {section === "rapport" && <RapportSection commandes={commandes} />}
      {section === "profil" && (
        <ProfilSection
          caissiere={caissiere}
          onLogout={() => setCaissiere(null)}
        />
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
