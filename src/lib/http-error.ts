// Une erreur qui connaît son code HTTP (400, 401, 403, 404, 409...).
// Dans une route, on écrit : throw new HttpError(404, "Ticket introuvable.");
// et le middleware d'erreurs renvoie { "error": "Ticket introuvable." } avec le code 404.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
