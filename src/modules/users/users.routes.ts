import { Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { valider } from "../../lib/validate";
import { lireId } from "../../lib/validation";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { utilisateurPublic } from "../auth/auth.service";
import { envoyerInvitation, peutGerer } from "./users.service";

// Ce routeur est branché sur "/users" dans app.ts
export const usersRouter = Router();

// Toutes les routes des utilisateurs sont réservées aux Admins et au Super Admin
usersRouter.use(authenticate, authorize("SUPER_ADMIN", "ADMIN"));

// Ce que doit contenir une demande de création de compte
const schemaCreation = z.object(
  {
    email: z.email({ error: "L'email n'est pas valide." }),
    name: z.string({ error: "Le nom doit être un texte." }).trim().min(1).max(100).optional(),
    role: z.enum(["ADMIN", "AGENT", "USER"], { error: "Rôle invalide. Valeurs possibles : ADMIN, AGENT, USER." }),
  },
  { error: "Le corps de la requête doit être un objet JSON." },
);

// Lit le :id de l'adresse et renvoie l'utilisateur correspondant (400 ou 404 sinon)
async function trouverUtilisateur(texteId: string) {
  const id = lireId(texteId);
  if (id === null) {
    throw new HttpError(400, "L'identifiant doit être un entier positif.");
  }
  const utilisateur = await prisma.user.findUnique({ where: { id } });
  if (!utilisateur) {
    throw new HttpError(404, "Utilisateur introuvable.");
  }
  return utilisateur;
}

// POST /users : créer un compte et envoyer l'invitation par email
usersRouter.post("/", async (req, res) => {
  const { email, name, role } = valider(schemaCreation, req.body);

  // Un Admin ne peut créer que des Agents et des Users
  if (!peutGerer(req.user!.role, role)) {
    throw new HttpError(403, `Accès refusé : vous ne pouvez pas créer un compte ${role}.`);
  }

  // L'email doit être libre, sinon 409 (conflit)
  const emailNormalise = email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email: emailNormalise } })) {
    throw new HttpError(409, "Un compte existe déjà avec cet email.");
  }

  // Le compte est créé sans mot de passe : la personne le choisira grâce à l'invitation
  const utilisateur = await prisma.user.create({ data: { email: emailNormalise, name, role } });
  await envoyerInvitation(utilisateur);

  res.status(201).json(utilisateurPublic(utilisateur));
});

// GET /users : lister les comptes
usersRouter.get("/", async (req, res) => {
  const utilisateurs = await prisma.user.findMany({ orderBy: { id: "asc" } });
  res.json(utilisateurs.map(utilisateurPublic));
});

// POST /users/:id/resend-invitation : renvoyer une invitation (l'ancienne ne marche plus)
usersRouter.post("/:id/resend-invitation", async (req: Request<{ id: string }>, res: Response) => {
  const utilisateur = await trouverUtilisateur(req.params.id);

  if (!peutGerer(req.user!.role, utilisateur.role)) {
    throw new HttpError(403, "Accès refusé : vous ne pouvez pas gérer ce compte.");
  }
  if (utilisateur.passwordHash !== null) {
    throw new HttpError(409, "Ce compte a déjà été activé.");
  }

  await envoyerInvitation(utilisateur);
  res.json({ message: "Invitation renvoyée." });
});
