import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { valider } from "../../lib/validate";
import { hacherMotDePasse, verifierMotDePasse } from "../../lib/password";
import { authenticate } from "../../middlewares/authenticate";
import { limiteConnexion } from "../../middlewares/rate-limit";
import { hacherJeton } from "../../lib/tokens";
import { ouvrirSession, revoquerToutesLesSessions, utilisateurPublic } from "./auth.service";

// Ce routeur est branché sur "/auth" dans app.ts
export const authRouter = Router();

const CORPS_INVALIDE = "Le corps de la requête doit être un objet JSON.";

// Ce que doit contenir une demande de connexion
const schemaConnexion = z.object(
  {
    email: z.email({ error: "L'email n'est pas valide." }),
    password: z.string({ error: "Le mot de passe est obligatoire." }).min(1, { error: "Le mot de passe est obligatoire." }),
  },
  { error: CORPS_INVALIDE },
);

// Ce que doit contenir une demande de refresh ou de déconnexion
const schemaRefresh = z.object(
  { refreshToken: z.string({ error: "Le champ refreshToken est obligatoire." }).min(1, { error: "Le champ refreshToken est obligatoire." }) },
  { error: CORPS_INVALIDE },
);

// Un nouveau mot de passe : au moins 8 caractères
const schemaMotDePasse = z
  .string({ error: "Le mot de passe est obligatoire." })
  .min(8, { error: "Le mot de passe doit faire au moins 8 caractères." })
  .max(72, { error: "Le mot de passe ne doit pas dépasser 72 caractères." });

// Ce que doit contenir une acceptation d'invitation ou une réinitialisation
const schemaJetonEtMotDePasse = z.object(
  {
    token: z.string({ error: "Le champ token est obligatoire." }).min(1, { error: "Le champ token est obligatoire." }),
    password: schemaMotDePasse,
  },
  { error: CORPS_INVALIDE },
);

// POST /auth/login : se connecter avec email + mot de passe
authRouter.post("/login", limiteConnexion, async (req, res) => {
  const { email, password } = valider(schemaConnexion, req.body);

  // Même message que l'email soit inconnu ou le mot de passe faux :
  // on ne révèle pas quels emails existent
  const utilisateur = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!utilisateur?.passwordHash || !(await verifierMotDePasse(password, utilisateur.passwordHash))) {
    throw new HttpError(401, "Email ou mot de passe incorrect.");
  }
  if (!utilisateur.isActive) {
    throw new HttpError(403, "Ce compte est désactivé.");
  }

  const jetons = await ouvrirSession(utilisateur);
  res.json({ ...jetons, user: utilisateurPublic(utilisateur) });
});

// GET /auth/me : qui suis-je ? (il faut être connecté)
authRouter.get("/me", authenticate, async (req, res) => {
  const utilisateur = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json(utilisateurPublic(utilisateur));
});

// POST /auth/refresh : échanger un refresh token contre un nouveau badge + un nouveau refresh token
authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = valider(schemaRefresh, req.body);

  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash: hacherJeton(refreshToken) },
    include: { user: true },
  });
  if (!session) {
    throw new HttpError(401, "Session invalide.");
  }

  // Ce token a déjà été utilisé (ou la personne s'est déconnectée) : quelqu'un essaie
  // peut-être de réutiliser un token volé. Par sécurité, on ferme TOUTES ses sessions.
  if (session.revokedAt) {
    await revoquerToutesLesSessions(session.userId);
    throw new HttpError(401, "Session révoquée. Veuillez vous reconnecter.");
  }
  if (session.expiresAt < new Date() || !session.user.isActive) {
    throw new HttpError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  // Rotation : l'ancien refresh token est révoqué, un nouveau est donné.
  // Le "where revokedAt: null" garantit qu'un même token ne peut servir qu'une fois.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    throw new HttpError(401, "Session révoquée. Veuillez vous reconnecter.");
  }

  res.json(await ouvrirSession(session.user));
});

// POST /auth/logout : se déconnecter (le refresh token ne pourra plus servir)
authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = valider(schemaRefresh, req.body);

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hacherJeton(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  // 204 : c'est fait, rien à renvoyer (même réponse si le token était inconnu)
  res.status(204).send();
});

// POST /auth/accept-invitation : choisir son mot de passe grâce au jeton reçu par email
authRouter.post("/accept-invitation", async (req, res) => {
  const { token, password } = valider(schemaJetonEtMotDePasse, req.body);

  // Jeton inconnu, déjà utilisé ou expiré : même réponse 400
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hacherJeton(token) },
    include: { user: true },
  });
  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date() || !invitation.user.isActive) {
    throw new HttpError(400, "Invitation invalide ou expirée.");
  }

  // On marque l'invitation comme utilisée ET on enregistre le mot de passe, en une seule fois.
  // Le "where usedAt: null" garantit qu'une invitation ne peut servir qu'une fois.
  const passwordHash = await hacherMotDePasse(password);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.invitation.updateMany({
      where: { id: invitation.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) {
      throw new HttpError(400, "Invitation invalide ou expirée.");
    }
    await tx.user.update({ where: { id: invitation.userId }, data: { passwordHash } });
  });

  res.json({ message: "Compte activé. Vous pouvez maintenant vous connecter." });
});
