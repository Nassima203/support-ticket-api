import { User } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { UN_JOUR, dansMillisecondes, genererJeton, hacherJeton, signerJetonAcces } from "../../lib/tokens";

// Ce qu'on renvoie d'un utilisateur : tout sauf l'empreinte du mot de passe
export function utilisateurPublic(utilisateur: User) {
  const { passwordHash, ...reste } = utilisateur;
  return { ...reste, invitationAcceptee: passwordHash !== null };
}

// Ouvre une session : un badge d'accès (15 min) + un refresh token (7 jours) enregistré en base
export async function ouvrirSession(utilisateur: User) {
  const refreshToken = genererJeton();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hacherJeton(refreshToken),
      userId: utilisateur.id,
      expiresAt: dansMillisecondes(env.REFRESH_TOKEN_DAYS * UN_JOUR),
    },
  });
  return { accessToken: signerJetonAcces(utilisateur), refreshToken };
}

// Ferme toutes les sessions encore ouvertes d'un utilisateur
export function revoquerToutesLesSessions(userId: number) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
