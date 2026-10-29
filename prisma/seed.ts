import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

// Seed : remplit la base avec les données de départ.
// Ici, il crée le compte Super Admin à partir des variables du fichier .env.
// Lancement : npx prisma db seed
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const motDePasse = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !motDePasse) {
    throw new Error("SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD doivent être définis dans .env");
  }

  // Si le compte existe déjà, on ne le recrée pas (le seed peut être relancé sans risque)
  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    console.log(`Le Super Admin ${email} existe déjà (id ${existant.id}).`);
    return;
  }

  // Le mot de passe est haché : il n'est jamais stocké en clair
  const passwordHash = await bcrypt.hash(motDePasse, 12);
  const superAdmin = await prisma.user.create({
    data: { email, name: "Super Admin", passwordHash, role: "SUPER_ADMIN" },
  });
  console.log(`Super Admin créé : ${superAdmin.email} (id ${superAdmin.id}).`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
