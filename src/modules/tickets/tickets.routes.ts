import { Request, Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/http-error";
import { valider } from "../../lib/validate";
import { lireId, schemaStatut } from "../../lib/validation";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";

// Ce routeur est branché sur "/tickets" dans app.ts :
// ici, "/" correspond donc à "/tickets" et "/:id" à "/tickets/:id".
export const ticketsRouter = Router();

// Toutes les routes des tickets demandent d'être connecté
ticketsRouter.use(authenticate);

const CORPS_INVALIDE = "Le corps de la requête doit être un objet JSON.";

// Ce que doit contenir un nouveau ticket
const schemaCreation = z.object(
  {
    title: z
      .string({ error: "Le champ title est obligatoire." })
      .trim()
      .min(1, { error: "Le champ title est obligatoire." })
      .max(150, { error: "Le titre ne doit pas dépasser 150 caractères." }),
    description: z
      .string({ error: "Le champ description est obligatoire." })
      .trim()
      .min(1, { error: "Le champ description est obligatoire." }),
  },
  { error: CORPS_INVALIDE },
);

// Le filtre facultatif de la liste : ?status=OPEN
const schemaFiltre = z.object({ status: schemaStatut.optional() });

// Le corps d'un changement de statut : { "status": "IN_PROGRESS" }
const schemaChangementStatut = z.object({ status: schemaStatut }, { error: CORPS_INVALIDE });

// Cherche un ticket par son numéro, ou lève une erreur 404
async function trouverTicket(id: number) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new HttpError(404, "Ticket introuvable.");
  }
  return ticket;
}

// POST /tickets : créer un ticket (tous les rôles). L'auteur est la personne connectée.
ticketsRouter.post("/", async (req, res) => {
  const { title, description } = valider(schemaCreation, req.body);

  const ticket = await prisma.ticket.create({
    data: { title, description, authorId: req.user!.id },
  });
  // 201 = "créé" : on renvoie le ticket enregistré, avec son id
  res.status(201).json(ticket);
});

// GET /tickets : lister les tickets, du plus récent au plus ancien (filtre facultatif : ?status=OPEN)
// Un USER ne voit que ses propres tickets ; les autres rôles voient tout.
ticketsRouter.get("/", async (req, res) => {
  const { status } = valider(schemaFiltre, req.query);

  const tickets = await prisma.ticket.findMany({
    where: {
      // Si status vaut undefined, Prisma ignore le filtre
      status,
      // Un USER est limité à ses tickets (undefined = pas de limite pour les autres rôles)
      authorId: req.user!.role === "USER" ? req.user!.id : undefined,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(tickets);
});

// GET /tickets/:id : récupérer un ticket par son numéro
ticketsRouter.get("/:id", async (req, res) => {
  const ticket = await trouverTicket(lireId(req.params.id));

  // Un USER ne peut consulter que ses propres tickets
  if (req.user!.role === "USER" && ticket.authorId !== req.user!.id) {
    throw new HttpError(403, "Accès refusé : ce ticket ne vous appartient pas.");
  }
  res.json(ticket);
});

// PATCH /tickets/:id/status : changer le statut d'un ticket (Agents, Admins et Super Admin)
ticketsRouter.patch("/:id/status", authorize("SUPER_ADMIN", "ADMIN", "AGENT"), async (req: Request<{ id: string }>, res: Response) => {
  const id = lireId(req.params.id);
  const { status } = valider(schemaChangementStatut, req.body);
  await trouverTicket(id);

  // updatedAt est mis à jour automatiquement par Prisma
  const ticket = await prisma.ticket.update({ where: { id }, data: { status } });
  res.json(ticket);
});
