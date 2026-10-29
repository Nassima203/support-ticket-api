import { Role, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { envoyerEmail } from "../../lib/mailer";
import { emailInvitation } from "../../lib/emails";
import { UNE_HEURE, dansMillisecondes, genererJeton, hacherJeton } from "../../lib/tokens";

// Une invitation est valable 48 heures
const DUREE_INVITATION = 48 * UNE_HEURE;

// Crée une nouvelle invitation pour un utilisateur et l'envoie par email.
// Les invitations précédentes non utilisées sont supprimées : seule la dernière fonctionne.
export async function envoyerInvitation(utilisateur: User) {
  const jeton = genererJeton();
  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { userId: utilisateur.id, usedAt: null } }),
    prisma.invitation.create({
      data: {
        tokenHash: hacherJeton(jeton),
        userId: utilisateur.id,
        expiresAt: dansMillisecondes(DUREE_INVITATION),
      },
    }),
  ]);
  await envoyerEmail(emailInvitation(utilisateur.email, jeton));
}

// Un Admin ne gère que les Agents et les Users ; le Super Admin gère aussi les Admins.
// Personne ne gère le Super Admin.
export function peutGerer(roleConnecte: Role, roleCible: Role): boolean {
  if (roleCible === "SUPER_ADMIN") return false;
  if (roleConnecte === "SUPER_ADMIN") return true;
  if (roleConnecte === "ADMIN") return roleCible === "AGENT" || roleCible === "USER";
  return false;
}
