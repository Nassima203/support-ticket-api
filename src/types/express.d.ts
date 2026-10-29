import { Role } from "@prisma/client";

// On ajoute "user" à la requête Express : le middleware authenticate le remplit
// avec l'utilisateur connecté, et les routes peuvent ensuite lire req.user.
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; role: Role };
    }
  }
}

export {};
