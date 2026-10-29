import rateLimit from "express-rate-limit";

// Limite les tentatives de connexion ratées : 5 par quart d'heure et par adresse IP.
// Protège contre ceux qui essaient des mots de passe au hasard.
export const limiteConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  // Les connexions réussies ne comptent pas
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
});
