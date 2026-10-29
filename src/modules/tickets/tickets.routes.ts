import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { STATUTS_VALIDES, estStatutValide, estTexteNonVide, lireId } from "../../lib/validation";

// Ce routeur est branché sur "/tickets" dans app.ts :
// ici, "/" correspond donc à "/tickets" et "/:id" à "/tickets/:id".
export const ticketsRouter = Router();

// POST /tickets : créer un ticket
ticketsRouter.post("/", async (req, res) => {
  // 1. On lit les informations envoyées dans le corps de la demande
  // (provisoire : authorId sera remplacé par l'utilisateur connecté à l'étape 17)
  const { title, description, authorId } = req.body ?? {};

  // 2. On vérifie qu'elles sont bien remplies, sinon erreur 400
  if (!estTexteNonVide(title) || !estTexteNonVide(description) || !Number.isInteger(authorId)) {
    res.status(400).json({ error: "Les champs title, description et authorId sont obligatoires." });
    return;
  }
  if (title.length > 150) {
    res.status(400).json({ error: "Le titre ne doit pas dépasser 150 caractères." });
    return;
  }

  // 3. On enregistre le ticket dans la base (le statut sera OPEN par défaut)
  const ticket = await prisma.ticket.create({
    data: { title, description, authorId },
  });

  // 201 = "créé" : on renvoie le ticket enregistré, avec son id
  res.status(201).json(ticket);
});

// GET /tickets : lister les tickets (filtre facultatif : ?status=OPEN)
ticketsRouter.get("/", async (req, res) => {
  // On lit le filtre dans l'adresse (il vaut undefined s'il n'y en a pas)
  const { status } = req.query;

  // Si un statut est donné, il doit faire partie des 4 autorisés, sinon erreur 400
  if (status !== undefined && !estStatutValide(status)) {
    res.status(400).json({
      error: `Statut invalide. Valeurs possibles : ${STATUTS_VALIDES.join(", ")}.`,
    });
    return;
  }

  const tickets = await prisma.ticket.findMany({
    // Si status vaut undefined, Prisma ignore le filtre et renvoie tout
    where: { status },
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
    res.status(400).json({ error: "L'identifiant doit être un entier positif." });
    return;
  }

  // 2. On cherche le ticket dans la base
  const ticket = await prisma.ticket.findUnique({ where: { id } });

  // 3. Aucun ticket avec ce numéro : 404
  if (!ticket) {
    res.status(404).json({ error: "Ticket introuvable." });
    return;
  }
  res.json(ticket);
});

// PATCH /tickets/:id/status : changer le statut d'un ticket
ticketsRouter.patch("/:id/status", async (req, res) => {
  // 1. Le numéro dans l'adresse doit être valide, sinon 400
  const id = lireId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "L'identifiant doit être un entier positif." });
    return;
  }

  // 2. Le nouveau statut (dans le corps de la demande) doit être l'un des 4 autorisés, sinon 400
  const { status } = req.body ?? {};
  if (!estStatutValide(status)) {
    res.status(400).json({
      error: `Statut invalide. Valeurs possibles : ${STATUTS_VALIDES.join(", ")}.`,
    });
    return;
  }

  // 3. Le ticket doit exister, sinon 404
  const existe = await prisma.ticket.findUnique({ where: { id } });
  if (!existe) {
    res.status(404).json({ error: "Ticket introuvable." });
    return;
  }

  // 4. On modifie le statut (updatedAt est mis à jour automatiquement par Prisma)
  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status },
  });
  res.json(ticket);
});
