import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http-error";
import { verifierJetonAcces } from "../lib/tokens";

// Vérifie que la demande vient d'une personne connectée.
// Le badge (JWT) doit être envoyé dans l'en-tête : Authorization: Bearer <jeton>
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const entete = req.headers.authorization;
  if (!entete?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authentification requise.");
  }

  // 1. Le badge doit être signé avec notre secret et ne pas être périmé
  let idUtilisateur: number;
  try {
    idUtilisateur = Number(verifierJetonAcces(entete.slice("Bearer ".length)).sub);
  } catch {
    throw new HttpError(401, "Jeton invalide ou expiré.");
  }

  // 2. Le compte doit toujours exister et être actif (un compte désactivé perd l'accès tout de suite)
  const utilisateur = await prisma.user.findUnique({ where: { id: idUtilisateur } });
  if (!utilisateur || !utilisateur.isActive) {
    throw new HttpError(401, "Compte introuvable ou désactivé.");
  }

  // 3. On garde l'utilisateur dans la requête pour les routes suivantes
  req.user = { id: utilisateur.id, email: utilisateur.email, role: utilisateur.role };
  next();
}
