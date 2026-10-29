import express from "express";
import { PrismaClient } from "@prisma/client";

// On crée l'application Express
const app = express();

// Le client Prisma : c'est lui qui parle à la base de données
const prisma = new PrismaClient();

// Le numéro de la "porte" sur laquelle le serveur attend les demandes
const PORT = 3000;

// Permet de lire le corps des demandes envoyé en JSON (il arrive dans req.body)
app.use(express.json());

// Vérifie qu'une valeur est un texte non vide (les espaces seuls ne comptent pas)
function estTexteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && valeur.trim() !== "";
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

// On démarre le serveur : il reste allumé et attend les demandes
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
