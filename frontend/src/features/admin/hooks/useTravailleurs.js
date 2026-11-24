import { useEffect, useState } from 'react';
import { normaliserMatricule } from '../utils';

const CLE_STOCKAGE = 'smartcaisse.beneficiaires';

// Données de démonstration du module admin local (à retirer lors du branchement API).
const BENEFICIAIRES_DEMO = [
  {
    id: 1,
    matricule: 'SA7206',
    nom: 'MAKOSSO',
    prenom: 'Jean',
    situation: 'Permanent',
    signatureFaciale: 'FACE-482193-731205864',
  },
  {
    id: 2,
    matricule: 'SA7207',
    nom: 'BOUSSOUKOU',
    prenom: 'Marie',
    situation: 'Stagiaire',
    signatureFaciale: 'FACE-482194-518902347',
  },
  {
    id: 3,
    matricule: 'SA7208',
    nom: 'NKOUNKOU',
    prenom: 'Paul',
    situation: 'Permanent',
    signatureFaciale: 'FACE-482195-904317628',
  },
];

function chargerBeneficiaires() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) {
      const parsed = JSON.parse(brut);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Stockage indisponible : on repart des données de démonstration.
  }
  return BENEFICIAIRES_DEMO;
}

export default function useBeneficiaires(notifier) {
  const [beneficiaires, setBeneficiaires] = useState(chargerBeneficiaires);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(beneficiaires));
    } catch {
      // Stockage indisponible : les données restent en mémoire.
    }
  }, [beneficiaires]);

  const ajouterBeneficiaire = ({
    matricule,
    nom,
    prenom,
    situation,
    signatureFaciale,
  }) => {
    const matriculeFormate = normaliserMatricule((matricule || '').trim());
    const nomPropre = (nom || '').trim().toUpperCase();
    const prenomPropre = (prenom || '').trim();

    if (!matriculeFormate || !nomPropre || !prenomPropre) {
      notifier(
        'erreur',
        'Champs obligatoires',
        'Veuillez saisir le matricule (ex: SA7206), le nom et le prénom du bénéficiaire.'
      );
      return false;
    }
    if (!signatureFaciale) {
      notifier(
        'erreur',
        'Traits faciaux manquants',
        'Veuillez scanner le visage pour générer son identifiant numérique unique.'
      );
      return false;
    }
    if (beneficiaires.some((b) => b.matricule === matriculeFormate)) {
      notifier(
        'erreur',
        'Matricule déjà utilisé',
        `Le matricule ${matriculeFormate} appartient déjà à un bénéficiaire.`
      );
      return false;
    }

    const nouveau = {
      id: Date.now(),
      matricule: matriculeFormate,
      nom: nomPropre,
      prenom: prenomPropre,
      situation,
      signatureFaciale,
    };

    setBeneficiaires((prev) => [nouveau, ...prev]);
    notifier(
      'succes',
      'Bénéficiaire enregistré',
      `${nouveau.prenom} ${nouveau.nom} (${nouveau.matricule} • ${nouveau.situation}) a été enregistré avec sa signature faciale unique.`
    );
    return true;
  };

  const modifierBeneficiaire = (beneficiaire) => {
    const matriculeFormate = normaliserMatricule((beneficiaire?.matricule || '').trim());
    const nomPropre = (beneficiaire?.nom || '').trim().toUpperCase();
    const prenomPropre = (beneficiaire?.prenom || '').trim();

    if (!matriculeFormate || !nomPropre || !prenomPropre) {
      notifier(
        'erreur',
        'Champs invalides',
        'Le matricule, le nom et le prénom sont obligatoires.'
      );
      return false;
    }
    if (
      beneficiaires.some(
        (b) => b.id !== beneficiaire.id && b.matricule === matriculeFormate
      )
    ) {
      notifier(
        'erreur',
        'Matricule déjà utilisé',
        `Le matricule ${matriculeFormate} appartient déjà à un autre bénéficiaire.`
      );
      return false;
    }

    setBeneficiaires((prev) =>
      prev.map((b) =>
        b.id === beneficiaire.id
          ? {
              ...b,
              matricule: matriculeFormate,
              nom: nomPropre,
              prenom: prenomPropre,
              situation: beneficiaire.situation,
              signatureFaciale: beneficiaire.signatureFaciale,
            }
          : b
      )
    );
    notifier(
      'succes',
      'Bénéficiaire modifié',
      `La fiche de ${prenomPropre} ${nomPropre} (${matriculeFormate}) a été mise à jour.`
    );
    return true;
  };

  const supprimerBeneficiaire = (beneficiaire) => {
    setBeneficiaires((prev) => prev.filter((b) => b.id !== beneficiaire.id));
    notifier(
      'succes',
      'Bénéficiaire supprimé',
      `${beneficiaire.prenom} ${beneficiaire.nom} a été retiré de la liste.`
    );
  };

  return {
    beneficiaires,
    ajouterBeneficiaire,
    modifierBeneficiaire,
    supprimerBeneficiaire,
  };
}
