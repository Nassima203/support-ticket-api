import "dotenv/config";
import { z } from "zod";

// Lit les variables du fichier .env et vérifie qu'elles sont toutes présentes et correctes.
// S'il en manque une, le serveur s'arrête tout de suite avec un message clair.
const schemaEnv = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, { error: "JWT_SECRET doit faire au moins 32 caractères." }),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("onboarding@resend.dev"),
  APP_URL: z.string().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),
});

const resultat = schemaEnv.safeParse(process.env);
if (!resultat.success) {
  console.error("Fichier .env incorrect :");
  for (const probleme of resultat.error.issues) {
    console.error(`- ${probleme.path.join(".")} : ${probleme.message}`);
  }
  process.exit(1);
}

export const env = resultat.data;
