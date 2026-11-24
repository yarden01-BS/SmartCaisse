import { useState } from 'react';
import { normaliserMatricule } from '../utils';

export default function useTravailleurs(notifier) {
  const [travailleurs, setTravailleurs] = useState([]);

  const ajouterTravailleur = ({
    matricule,
    nom,
    prenom,
    statut,
    signatureFaciale,
  }) => {
    const matriculeFormate = normaliserMatricule((matricule || '').trim());
    const nomPropre = (nom || '').trim().toUpperCase();
    const prenomPropre = (prenom || '').trim();

    if (!matriculeFormate || !nomPropre || !prenomPropre) {
      notifier(
        'erreur',
        'Champs obligatoires',
        'Veuillez saisir le matricule (ex: SA7206), le nom et le prénom du travailleur.'
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

    const nouveau = {
      id: Date.now(),
      matricule: matriculeFormate,
      nom: nomPropre,
      prenom: prenomPropre,
      statut,
      signatureFaciale,
    };

    setTravailleurs([nouveau, ...travailleurs]);
    notifier(
      'succes',
      'Travailleur enregistré',
      `${nouveau.prenom} ${nouveau.nom} (${nouveau.matricule} • ${nouveau.statut}) a été enregistré avec sa signature faciale unique.`
    );
    return true;
  };

  const modifierTravailleur = (travailleur) => {
    const matriculeFormate = normaliserMatricule((travailleur?.matricule || '').trim());
    const nomPropre = (travailleur?.nom || '').trim().toUpperCase();
    const prenomPropre = (travailleur?.prenom || '').trim();

    if (!matriculeFormate || !nomPropre || !prenomPropre) {
      notifier(
        'erreur',
        'Champs invalides',
        'Le matricule, le nom et le prénom sont obligatoires.'
      );
      return false;
    }

    setTravailleurs((prev) =>
      prev.map((t) =>
        t.id === travailleur.id
          ? {
              ...t,
              matricule: matriculeFormate,
              nom: nomPropre,
              prenom: prenomPropre,
              statut: travailleur.statut,
              signatureFaciale: travailleur.signatureFaciale,
            }
          : t
      )
    );
    notifier(
      'succes',
      'Travailleur modifié',
      `La fiche de ${prenomPropre} ${nomPropre} (${matriculeFormate}) a été mise à jour.`
    );
    return true;
  };

  const supprimerTravailleur = (travailleur) => {
    setTravailleurs((prev) => prev.filter((t) => t.id !== travailleur.id));
    notifier(
      'succes',
      'Travailleur supprimé',
      `${travailleur.prenom} ${travailleur.nom} a été retiré de la liste.`
    );
  };

  return { travailleurs, ajouterTravailleur, modifierTravailleur, supprimerTravailleur };
}
