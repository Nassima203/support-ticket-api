import express from "express";

// On crée l'application Express
const app = express();

// Le numéro de la "porte" sur laquelle le serveur attend les demandes
const PORT = 3000;

// Route de test : quand on visite http://localhost:3000/, on répond un petit message
app.get("/", (req, res) => {
  res.json({ message: "L'API fonctionne" });
});

// On démarre le serveur : il reste allumé et attend les demandes
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
