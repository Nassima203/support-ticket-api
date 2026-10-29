import { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

// Aucune route n'a répondu : l'adresse demandée n'existe pas
export function routeIntrouvable(req: Request, res: Response) {
  res.status(404).json({ error: "Route introuvable." });
}

// Middleware d'erreur final : il a 4 paramètres, c'est ce qui le distingue pour Express.
// Avec Express 5, les erreurs des routes async arrivent ici automatiquement.
export function gestionErreurs(err: any, req: Request, res: Response, next: NextFunction) {
  // Erreur prévue, levée avec throw new HttpError(...)
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Corps de demande qui n'est pas du JSON valide (erreur levée par express.json())
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Le corps de la requête n'est pas un JSON valide." });
    return;
  }

  // Erreur imprévue : on affiche le détail dans le terminal du serveur (pour nous),
  // mais on renvoie un message simple au client (sans détail technique)
  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur." });
}
