import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { HttpError } from "../lib/http-error";

// Vérifie que la personne connectée a l'un des rôles autorisés.
// À placer APRÈS authenticate. Exemple : authorize("ADMIN", "SUPER_ADMIN")
export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new HttpError(401, "Authentification requise.");
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, "Accès refusé : votre rôle ne le permet pas.");
    }
    next();
  };
}
