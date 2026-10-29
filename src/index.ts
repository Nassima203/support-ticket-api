import express from "express";
import { PrismaClient, TicketStatus } from "@prisma/client";

// On crée l'application Express
const app = express();

// Le client Prisma : c'est lui qui parle à la base de données
const prisma = new PrismaClient();

// Le numéro de la "porte" sur laquelle le serveur attend les demandes
const PORT = 3000;

// Permet de lire le corps des demandes envoyé en JSON (il arrive dans req.body)
app.use(express.json());

// Les 4 statuts autorisés, lus directement depuis le schéma Prisma
const STATUTS_VALIDES = Object.values(TicketStatus);

// Vérifie qu'une valeur est un texte non vide (les espaces seuls ne comptent pas)
function estTexteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.trim() !== "";
}

// Vérifie qu'une valeur fait partie des 4 statuts autorisés
function estStatutValide(valeur: unknown): valeur is TicketStatus {
  return STATUTS_VALIDES.includes(valeur as TicketStatus);
}

// Route de test : quand on visite http://localhost:3000/, on répond un petit message
app.get("/", (req, res) => {
  res.json({ message: "L'API fonctionne" });
});

// POST /tickets : créer un ticket
app.post("/tickets", async (req, res) => {
  // 1. On lit les informations envoyées dans le corps de la demande
  const { title, description, authorEmail } = req.body ?? {};

  // 2. On vérifie qu'elles sont bien remplies, sinon erreur 400
  if (!estTexteNonVide(title) || !estTexteNonVide(description) || !estTexteNonVide(authorEmail)) {
    res.status(400).json({ error: "Les champs title, description et authorEmail sont obligatoires." });
    return;
  }
  if (title.length > 150) {
    res.status(400).json({ error: "Le titre ne doit pas dépasser 150 caractères." });
    return;
  }

  // 3. On enregistre le ticket dans la base (le statut sera OPEN par défaut)
  const ticket = await prisma.ticket.create({
    data: { title, description, authorEmail },
  });

  // 201 = "créé" : on renvoie le ticket enregistré, avec son id
  res.status(201).json(ticket);
});

// GET /tickets : lister les tickets (filtre facultatif : ?status=OPEN)
app.get("/tickets", async (req, res) => {
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

// On démarre le serveur : il reste allumé et attend les demandes
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
