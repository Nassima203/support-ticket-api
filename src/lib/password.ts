import bcrypt from "bcrypt";

// Coût du hachage : plus il est élevé, plus il est lent (et difficile à casser)
const COUT = 12;

// Transforme un mot de passe en empreinte illisible (c'est elle qu'on stocke)
export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, COUT);
}

// Vérifie qu'un mot de passe correspond à une empreinte enregistrée
export function verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, empreinte);
}
