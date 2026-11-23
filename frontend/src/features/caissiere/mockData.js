import { aujourdhuiStr, moisActuelStr } from './utils';

export const personnelMock = [
  { id: 1, matricule: 'SIAT-104', nom: 'Jean Makosso', statut: 'Travailleur', service: 'Production' },
  { id: 2, matricule: 'SIAT-218', nom: 'Clarisse Moukoko', statut: 'Stagiaire', service: 'Comptabilité' },
  { id: 3, matricule: 'SIAT-089', nom: 'Alain Nzaba', statut: 'Travailleur', service: 'Logistique' },
  { id: 4, matricule: 'SIAT-312', nom: 'Nadia Malonga', statut: 'Stagiaire', service: 'Qualité' },
  { id: 5, matricule: 'SIAT-145', nom: 'Brice Ondongo', statut: 'Travailleur', service: 'Maintenance' },
];

export const commandesInitiales = [
  {
    numBon: 1,
    date: `${aujourdhuiStr} 08:45`,
    client: personnelMock[0],
    prixTotal: 2500,
    partEntreprise: 1000,
    partClient: 1500,
  },
  {
    numBon: 2,
    date: `${aujourdhuiStr} 09:30`,
    client: personnelMock[1],
    prixTotal: 1600,
    partEntreprise: 800,
    partClient: 800,
  },
  {
    numBon: 3,
    date: `${moisActuelStr}-02 12:15`,
    client: personnelMock[2],
    prixTotal: 3000,
    partEntreprise: 1000,
    partClient: 2000,
  },
];
