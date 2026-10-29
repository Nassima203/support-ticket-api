# Support Ticket API

API REST de gestion de tickets de support : créer un ticket, lister les tickets (avec un filtre par statut), consulter un ticket et modifier son statut.

Projet d'apprentissage, sans interface graphique et sans authentification.

## Stack

- **Node.js** + **Express 5** : serveur HTTP
- **TypeScript** : typage du code
- **PostgreSQL 16** : base de données (lancée avec Docker)
- **Prisma 6** : accès à la base et migrations

## Routes

| Méthode | Route                 | Description                                | Succès | Erreurs  |
|---------|-----------------------|--------------------------------------------|--------|----------|
| POST    | `/tickets`            | Créer un ticket                            | 201    | 400      |
| GET     | `/tickets`            | Lister les tickets (`?status=` optionnel)  | 200    | 400      |
| GET     | `/tickets/:id`        | Récupérer un ticket par son ID             | 200    | 400, 404 |
| PATCH   | `/tickets/:id/status` | Modifier le statut d'un ticket             | 200    | 400, 404 |

- `POST /tickets` attend un corps JSON avec `title` (150 caractères max), `description` et `authorEmail`, tous obligatoires.
- `GET /tickets` renvoie les tickets du plus récent au plus ancien.
- `PATCH /tickets/:id/status` attend un corps JSON `{ "status": "..." }`.
- Toutes les erreurs ont le format `{ "error": "message" }`. Une adresse inconnue renvoie 404, une erreur imprévue renvoie 500.

## Statuts possibles

| Statut        | Signification              |
|---------------|----------------------------|
| `OPEN`        | Ouvert (statut par défaut) |
| `IN_PROGRESS` | En cours de traitement     |
| `RESOLVED`    | Résolu                     |
| `CLOSED`      | Fermé                      |

## Installation

Prérequis : Node.js, npm et Docker Desktop (lancé).

```bash
git clone https://github.com/Nassima203/support-ticket-api.git
cd support-ticket-api
npm install
docker compose up -d          # démarre PostgreSQL sur le port 5432
cp .env.example .env          # crée le fichier de configuration local
npx prisma migrate dev        # crée la table tickets
npm run dev                   # démarre l'API sur http://localhost:3000
```

Autres scripts : `npm run build` (compile vers `dist/`), `npm start` (lance la version compilée), `npm run db:studio` (interface Prisma Studio pour voir les données).

## Exemple

Créer un ticket :

```bash
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Wifi coupé","description":"Plus de connexion","authorEmail":"nassima@example.com"}'
```

Réponse (201) :

```json
{
  "id": 1,
  "title": "Wifi coupé",
  "description": "Plus de connexion",
  "status": "OPEN",
  "authorEmail": "nassima@example.com",
  "createdAt": "2026-10-29T14:29:34.393Z",
  "updatedAt": "2026-10-29T14:29:34.393Z"
}
```

Passer ce ticket en cours de traitement, puis lister les tickets en cours :

```bash
curl -X PATCH http://localhost:3000/tickets/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

curl "http://localhost:3000/tickets?status=IN_PROGRESS"
```
