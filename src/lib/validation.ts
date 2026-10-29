import { TicketStatus } from "@prisma/client";
import { z } from "zod";
import { valider } from "./validate";

// Schémas zod partagés par plusieurs routes

// Les 4 statuts autorisés, lus directement depuis le schéma Prisma
export const STATUTS_VALIDES = Object.values(TicketStatus);
export const MESSAGE_STATUT = `Statut invalide. Valeurs possibles : ${STATUTS_VALIDES.join(", ")}.`;
export const schemaStatut = z.enum(TicketStatus, { error: MESSAGE_STATUT });

// Plus grand nombre entier qu'une colonne "integer" de PostgreSQL peut contenir
const ID_MAX = 2147483647;
const MESSAGE_ID = "L'identifiant doit être un entier positif.";

// Le :id de l'adresse : uniquement des chiffres, entre 1 et ID_MAX (refuse "abc", "-3", "1.5", "0")
const schemaId = z
  .string()
  .regex(/^\d+$/, { error: MESSAGE_ID })
  .transform(Number)
  .refine((id) => id >= 1 && id <= ID_MAX, { error: MESSAGE_ID });

// Transforme le :id de l'adresse en nombre, ou lève une erreur 400
export function lireId(texte: string): number {
  return valider(schemaId, texte);
}
