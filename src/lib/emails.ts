import { env } from "../config/env";
import { Email } from "./mailer";

// Les modèles d'emails envoyés par l'API.
// Chaque fonction fabrique un email (texte simple + HTML) à partir de quelques informations.

// Email d'invitation : la personne choisit son mot de passe grâce au jeton (valable 48 h)
export function emailInvitation(destinataire: string, jeton: string): Email {
  const lien = `${env.APP_URL}/accept-invitation?token=${jeton}`;
  return {
    to: destinataire,
    subject: "Invitation à Support Ticket",
    text:
      `Bonjour,\n\nUn compte Support Ticket a été créé pour vous.\n` +
      `Pour l'activer, choisissez votre mot de passe en ouvrant ce lien (valable 48 heures) :\n${lien}\n\n` +
      `Jeton d'invitation : ${jeton}\n`,
    html:
      `<p>Bonjour,</p><p>Un compte Support Ticket a été créé pour vous.</p>` +
      `<p><a href="${lien}">Activer mon compte</a> (lien valable 48 heures)</p>`,
  };
}

// Email de réinitialisation : la personne choisit un nouveau mot de passe (jeton valable 1 h)
export function emailReinitialisation(destinataire: string, jeton: string): Email {
  const lien = `${env.APP_URL}/reset-password?token=${jeton}`;
  return {
    to: destinataire,
    subject: "Réinitialisation de votre mot de passe",
    text:
      `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe.\n` +
      `Ouvrez ce lien (valable 1 heure) pour en choisir un nouveau :\n${lien}\n\n` +
      `Jeton de réinitialisation : ${jeton}\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n`,
    html:
      `<p>Bonjour,</p><p>Vous avez demandé à réinitialiser votre mot de passe.</p>` +
      `<p><a href="${lien}">Choisir un nouveau mot de passe</a> (lien valable 1 heure)</p>` +
      `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  };
}
