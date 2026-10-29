import { Request, Response, Router } from "express";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { STATUTS_VALIDES, estStatutValide, estTexteNonVide, lireId } from "../../lib/validation";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

// Ce routeur est branché sur "/tickets" dans app.ts :
// ici, "/" correspond donc à "/tickets" et "/:id" à "/tickets/:id".
export const ticketsRouter = Router();

// Toutes les routes des tickets demandent d'être connecté
ticketsRouter.use(authenticate);

// POST /tickets : créer un ticket (tous les rôles)
ticketsRouter.post("/", async (req, res) => {
  // 1. On lit les informations envoyées dans le corps de la demande
  const { title, description } = req.body ?? {};

  // 2. On vérifie qu'elles sont bien remplies, sinon erreur 400
  if (!estTexteNonVide(title) || !estTexteNonVide(description)) {
    throw new HttpError(400, "Les champs title et description sont obligatoires.");
  }
  if (title.length > 150) {
    throw new HttpError(400, "Le titre ne doit pas dépasser 150 caractères.");
  }

  // 3. On enregistre le ticket : l'auteur est la personne connectée
  const ticket = await prisma.ticket.create({
    data: { title, description, authorId: req.user!.id },
  });

  // 201 = "créé" : on renvoie le ticket enregistré, avec son id
  res.status(201).json(ticket);
});

// GET /tickets : lister les tickets (filtre facultatif : ?status=OPEN)
// Un USER ne voit que ses propres tickets ; les autres rôles voient tout.
ticketsRouter.get("/", async (req, res) => {
  // On lit le filtre dans l'adresse (il vaut undefined s'il n'y en a pas)
  const { status } = req.query;

  // Si un statut est donné, il doit faire partie des 4 autorisés, sinon erreur 400
  if (status !== undefined && !estStatutValide(status)) {
    throw new HttpError(400, `Statut invalide. Valeurs possibles : ${STATUTS_VALIDES.join(", ")}.`);
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      // Si status vaut undefined, Prisma ignore le filtre
      status,
      // Un USER est limité à ses tickets (undefined = pas de limite pour les autres rôles)
      authorId: req.user!.role === "USER" ? req.user!.id : undefined,
    },
    // Du plus récent au plus ancien
    orderBy: { createdAt: "desc" },
  });
  res.json(tickets);
});

// GET /tickets/:id : récupérer un ticket par son numéro
ticketsRouter.get("/:id", async (req, res) => {
  // 1. On lit le numéro dans l'adresse et on vérifie qu'il est valide, sinon 400
  const id = lireId(req.params.id);
  if (id === null) {
    throw new HttpError(400, "L'identifiant doit être un entier positif.");
  }

  // 2. On cherche le ticket dans la base ; aucun ticket avec ce numéro : 404
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new HttpError(404, "Ticket introuvable.");
  }

  // 3. Un USER ne peut consulter que ses propres tickets
  if (req.user!.role === "USER" && ticket.authorId !== req.user!.id) {
    throw new HttpError(403, "Accès refusé : ce ticket ne vous appartient pas.");
  }
  res.json(ticket);
});

// PATCH /tickets/:id/status : changer le statut d'un ticket (Agents, Admins et Super Admin)
ticketsRouter.patch("/:id/status", authorize("SUPER_ADMIN", "ADMIN", "AGENT"), async (req: Request<{ id: string }>, res: Response) => {
  // 1. Le numéro dans l'adresse doit être valide, sinon 400
  const id = lireId(req.params.id);
  if (id === null) {
    throw new HttpError(400, "L'identifiant doit être un entier positif.");
  }

  // 2. Le nouveau statut (dans le corps de la demande) doit être l'un des 4 autorisés, sinon 400
  const { status } = req.body ?? {};
  if (!estStatutValide(status)) {
    throw new HttpError(400, `Statut invalide. Valeurs possibles : ${STATUTS_VALIDES.join(", ")}.`);
  }

  // 3. Le ticket doit exister, sinon 404
  const existe = await prisma.ticket.findUnique({ where: { id } });
  if (!existe) {
    throw new HttpError(404, "Ticket introuvable.");
  }

  // 4. On modifie le statut (updatedAt est mis à jour automatiquement par Prisma)
  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status },
  });
  res.json(ticket);
});
