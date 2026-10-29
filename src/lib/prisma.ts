import { PrismaClient } from "@prisma/client";

// Un seul client Prisma pour toute l'application : tous les fichiers importent celui-ci
export const prisma = new PrismaClient();
