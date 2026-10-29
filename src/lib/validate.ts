import { z } from "zod";
import { HttpError } from "./http-error";

// Vérifie des données avec un schéma zod.
// Si elles ne conviennent pas, lève une erreur 400 avec le premier message trouvé.
export function valider<T>(schema: z.ZodType<T>, donnees: unknown): T {
  const resultat = schema.safeParse(donnees);
  if (!resultat.success) {
    throw new HttpError(400, resultat.error.issues[0].message);
  }
  return resultat.data;
}
