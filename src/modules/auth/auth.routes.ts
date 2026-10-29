import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { valider } from "../../lib/validate";
import { verifierMotDePasse } from "../../lib/password";
import { authenticate } from "../../middlewares/authenticate";
import { limiteConnexion } from "../../middlewares/rate-limit";
import { ouvrirSession, utilisateurPublic } from "./auth.service";

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
