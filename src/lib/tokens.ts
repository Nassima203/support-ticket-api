import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env";

// ---------- JWT d'accès : un "badge" signé, valable peu de temps (15 min) ----------

// Ce que contient le badge : l'id de l'utilisateur (sub) et son rôle
export type ContenuJeton = { sub: string; role: Role };

export function signerJetonAcces(utilisateur: { id: number; role: Role }): string {
  return jwt.sign({ role: utilisateur.role }, env.JWT_SECRET, {
    subject: String(utilisateur.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

// Vérifie la signature et la date d'expiration ; lève une erreur si le badge est faux ou périmé
export function verifierJetonAcces(jeton: string): ContenuJeton {
  return jwt.verify(jeton, env.JWT_SECRET) as ContenuJeton;
}

// ---------- Jetons aléatoires : sessions, invitations, réinitialisations ----------

// Un jeton aléatoire de 64 caractères, impossible à deviner
export function genererJeton(): string {
  return randomBytes(32).toString("hex");
}

// L'empreinte SHA-256 d'un jeton : c'est elle qu'on stocke en base, jamais le jeton lui-même
export function hacherJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

// Une date située "dans X millisecondes"
export function dansMillisecondes(ms: number): Date {
  return new Date(Date.now() + ms);
}

export const UNE_HEURE = 60 * 60 * 1000;
export const UN_JOUR = 24 * UNE_HEURE;
