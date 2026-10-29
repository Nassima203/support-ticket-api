import { env } from "./config/env";
import { app } from "./app";

// Ce fichier ne fait que démarrer le serveur.
// L'application elle-même (routes, erreurs) est assemblée dans app.ts.
app.listen(env.PORT, () => {
  console.log(`API démarrée sur http://localhost:${env.PORT}`);
});
