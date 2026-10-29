import { TicketStatus } from "@prisma/client";

// Les 4 statuts autorisés, lus directement depuis le schéma Prisma
export const STATUTS_VALIDES = Object.values(TicketStatus);

// Plus grand nombre entier qu'une colonne "integer" de PostgreSQL peut contenir
const ID_MAX = 2147483647;

// Vérifie qu'une valeur est un texte non vide (les espaces seuls ne comptent pas)
export function estTexteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.trim() !== "";
}

// Vérifie qu'une valeur fait partie des 4 statuts autorisés
export function estStatutValide(valeur: unknown): valeur is TicketStatus {
  return STATUTS_VALIDES.includes(valeur as TicketStatus);
}

// Transforme le :id de l'adresse en nombre entier positif.
// Renvoie null si ce n'est pas un numéro valide (ex. "abc", "-3", "1.5", "0").
export function lireId(texte: string): number | null {
  // On n'accepte que des chiffres
  if (!/^\d+$/.test(texte)) return null;
  const id = Number(texte);
  if (id < 1 || id > ID_MAX) return null;
  return id;
}
