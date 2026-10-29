import express from "express";
import { gestionErreurs, routeIntrouvable } from "./middlewares/errors";
import { authRouter } from "./modules/auth/auth.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";
import { usersRouter } from "./modules/users/users.routes";

// Ce fichier assemble l'application. L'ordre des app.use() compte :
// Express essaie chaque élément de haut en bas.
export const app = express();

// 1. Permet de lire le corps des demandes envoyé en JSON (il arrive dans req.body)
app.use(express.json());

// 2. Route de test : quand on visite http://localhost:3000/, on répond un petit message
app.get("/", (req, res) => {
  res.json({ message: "L'API fonctionne" });
});

// 3. Les routes de chaque module
app.use("/auth", authRouter);
app.use("/tickets", ticketsRouter);
app.use("/users", usersRouter);

// 4. Aucune route n'a répondu : 404
app.use(routeIntrouvable);

// 5. Une erreur a été levée quelque part : 400, 401, 403, 404, 409 ou 500
app.use(gestionErreurs);
