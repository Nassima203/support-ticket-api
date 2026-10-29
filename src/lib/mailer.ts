import { Resend } from "resend";
import { env } from "../config/env";

// Un email prêt à partir
export type Email = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// Le client Resend n'est créé que si une clé API est présente dans .env
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Envoie un email avec Resend.
// Sans clé (RESEND_API_KEY vide), l'email est affiché dans le terminal du serveur :
// pratique pour développer et tester sans compte Resend.
export async function envoyerEmail(email: Email): Promise<void> {
  if (!resend) {
    console.log("\n===== EMAIL (mode développement, non envoyé) =====");
    console.log(`À      : ${email.to}`);
    console.log(`Sujet  : ${email.subject}`);
    console.log(email.text);
    console.log("==================================================\n");
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  if (error) {
    throw new Error(`Envoi de l'email impossible : ${error.message}`);
  }
}
