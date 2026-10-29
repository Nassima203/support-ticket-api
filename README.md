# Support Ticket API

API REST de gestion de tickets de support, avec comptes utilisateurs, connexion par jetons (JWT) et rôles.

- Les **utilisateurs** créent des tickets et suivent les leurs.
- Les **agents** traitent les tickets et changent leur statut.
- Les **admins** invitent de nouveaux comptes et peuvent les désactiver.

Projet d'apprentissage, sans interface graphique.

## Stack

- **Node.js** + **Express 5** : serveur HTTP
- **TypeScript** : typage du code
- **PostgreSQL 16** : base de données (lancée avec Docker)
- **Prisma 6** : accès à la base et migrations
- **zod** : validation des données reçues
- **bcrypt** : hachage des mots de passe
- **jsonwebtoken** : jetons d'accès (JWT)
- **Resend** : envoi des emails (invitation, mot de passe oublié)
- **express-rate-limit** : limite des tentatives de connexion

## Rôles

| Rôle          | Peut faire                                                                              |
|---------------|-----------------------------------------------------------------------------------------|
| `SUPER_ADMIN` | tout ; créé par le seed, ne peut être ni désactivé ni créé par l'API                     |
| `ADMIN`       | gérer les comptes `AGENT` et `USER` (créer, inviter, désactiver), traiter les tickets    |
| `AGENT`       | voir tous les tickets et changer leur statut                                             |
| `USER`        | créer des tickets, voir uniquement les siens                                             |

## Routes

Les routes marquées 🔒 demandent l'en-tête `Authorization: Bearer <accessToken>`.

### Authentification

| Méthode | Route                       | Description                                                          | Succès |
|---------|-----------------------------|----------------------------------------------------------------------|--------|
| POST    | `/auth/login`               | Se connecter (5 essais ratés max par 15 min)                          | 200    |
| GET     | `/auth/me` 🔒               | Voir son propre compte                                                | 200    |
| POST    | `/auth/refresh`             | Échanger un refresh token contre de nouveaux jetons (rotation)        | 200    |
| POST    | `/auth/logout`              | Fermer la session (le refresh token ne marche plus)                   | 204    |
| POST    | `/auth/accept-invitation`   | Choisir son mot de passe avec le jeton d'invitation (valable 48 h)    | 200    |
| POST    | `/auth/forgot-password`     | Recevoir un lien de réinitialisation (répond toujours 200)            | 200    |
| POST    | `/auth/reset-password`      | Choisir un nouveau mot de passe (valable 1 h, ferme les sessions)     | 200    |

### Utilisateurs (🔒 `ADMIN` et `SUPER_ADMIN`)

| Méthode | Route                              | Description                                       | Succès |
|---------|------------------------------------|---------------------------------------------------|--------|
| POST    | `/users`                           | Créer un compte et envoyer l'invitation par email | 201    |
| GET     | `/users`                           | Lister les comptes                                | 200    |
| POST    | `/users/:id/resend-invitation`     | Renvoyer une invitation (l'ancienne est annulée)  | 200    |
| PATCH   | `/users/:id/disable`               | Désactiver un compte (sessions fermées)           | 200    |
| PATCH   | `/users/:id/enable`                | Réactiver un compte                               | 200    |

Règles : un `ADMIN` ne gère que les `AGENT` et `USER` ; personne ne touche au `SUPER_ADMIN` ; on ne peut pas désactiver son propre compte ; un email déjà utilisé est refusé (409).

### Tickets (🔒 tous les rôles)

| Méthode | Route                 | Description                                                  | Succès |
|---------|-----------------------|--------------------------------------------------------------|--------|
| POST    | `/tickets`            | Créer un ticket (l'auteur est la personne connectée)         | 201    |
| GET     | `/tickets`            | Lister les tickets, du plus récent au plus ancien (`?status=` optionnel) | 200 |
| GET     | `/tickets/:id`        | Récupérer un ticket par son ID                               | 200    |
| PATCH   | `/tickets/:id/status` | Modifier le statut (`AGENT`, `ADMIN`, `SUPER_ADMIN`)         | 200    |

Un `USER` ne voit et ne consulte que ses propres tickets.

### Statuts possibles

| Statut        | Signification              |
|---------------|----------------------------|
| `OPEN`        | Ouvert (statut par défaut) |
| `IN_PROGRESS` | En cours de traitement     |
| `RESOLVED`    | Résolu                     |
| `CLOSED`      | Fermé                      |

### Erreurs

Toutes les erreurs ont le format `{ "error": "message" }` :

| Code | Signification                                               |
|------|-------------------------------------------------------------|
| 400  | données invalides (champ manquant, id incorrect, jeton faux ou expiré…) |
| 401  | pas connecté, jeton invalide ou expiré                       |
| 403  | connecté mais pas autorisé (rôle insuffisant, compte désactivé) |
| 404  | ressource ou route introuvable                               |
| 409  | conflit (email déjà utilisé, compte déjà activé)             |
| 413  | corps de la requête trop volumineux                          |
| 429  | trop de tentatives de connexion                              |
| 500  | erreur imprévue du serveur                                   |

## Installation

Prérequis : Node.js, npm et Docker Desktop (lancé).

```bash
git clone https://github.com/Nassima203/support-ticket-api.git
cd support-ticket-api
npm install
docker compose up -d          # démarre PostgreSQL sur le port 5432
cp .env.example .env          # crée le fichier de configuration local
```

Dans `.env`, remplacer :

- `JWT_SECRET` par le résultat de `openssl rand -hex 32` ;
- `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` par les identifiants du premier compte ;
- `RESEND_API_KEY` par une clé de [resend.com](https://resend.com) (facultatif : si elle est vide, les emails sont affichés dans le terminal du serveur au lieu d'être envoyés).

Puis :

```bash
npx prisma migrate dev        # crée les tables
npx prisma db seed            # crée le compte Super Admin
npm run dev                   # démarre l'API sur http://localhost:3000
```

Autres scripts : `npm run build` (compile vers `dist/`), `npm start` (lance la version compilée), `npm run db:studio` (Prisma Studio pour voir les données).

## Exemple

Se connecter, puis créer un ticket avec le jeton reçu :

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<mot de passe du .env>"}'
# → { "accessToken": "eyJ...", "refreshToken": "68ab...", "user": { ... } }

curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"title":"Wifi coupé","description":"Plus de connexion"}'
# → 201 { "id": 1, "title": "Wifi coupé", "status": "OPEN", "authorId": 1, ... }
```

Inviter un agent (Admin ou Super Admin) :

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"email":"camille@example.com","name":"Camille","role":"AGENT"}'
# → 201, et un email d'invitation part vers camille@example.com
```
