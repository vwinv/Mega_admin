import type { Role } from "@/lib/roles";

export type SessionUser = {
  id: string;
  identifiant: string;
  nom: string;
  role: Role;
  email: string | null;
};
