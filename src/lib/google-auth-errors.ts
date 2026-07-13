export const GOOGLE_LOGIN_ERRORS: Record<string, string> = {
  google_denied: "Connexion Google annulée.",
  google_config:
    "Connexion Google non configurée. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.",
  google_state: "Session Google expirée. Réessayez.",
  google_unauthorized:
    "Ce compte Google n'est pas autorisé. Votre e-mail doit être enregistré par l'administrateur.",
  google_domain: "Domaine e-mail non autorisé pour cette application.",
  google_inactive: "Votre compte est désactivé.",
  google_unverified: "Adresse e-mail Google non vérifiée.",
  google_error: "Erreur lors de la connexion Google. Réessayez.",
};
