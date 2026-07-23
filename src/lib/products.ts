import type { Role } from "@/lib/roles";

export type ProductId = "finance" | "signature";

export type MegaProduct = {
  id: ProductId;
  name: string;
  description: string;
  href: string;
  /** Préfixes d'URL qui appartiennent à ce produit */
  pathPrefixes: string[];
  /** Couleurs tuile (style apps) */
  tile: {
    bg: string;
    accent: string;
  };
  /** Si défini, seuls ces rôles voient le produit */
  roles?: Role[];
  /** Produit visible mais pas encore disponible */
  comingSoon?: boolean;
};

/**
 * Catalogue des produits MEGA.
 * Ajouter ici chaque nouveau module (CRM, RH, etc.) au fur et à mesure.
 */
export const MEGA_PRODUCTS: MegaProduct[] = [
  {
    id: "finance",
    name: "Finance",
    description: "Comptabilité, trésorerie, facturation et contrôles",
    href: "/finance",
    pathPrefixes: [
      "/finance",
      "/journal",
      "/caisse",
      "/tresorerie",
      "/facturation",
      "/archives",
      "/budget",
      "/codes-budgetaires",
      "/plan-comptable",
      "/synthese",
      "/impots",
      "/controle",
      "/approbations",
      "/import",
      "/parametres",
      "/utilisateurs",
      "/audit",
    ],
    tile: {
      bg: "linear-gradient(145deg, #1a4a6e 0%, #0e2433 100%)",
      accent: "#d2b36c",
    },
  },
  {
    id: "signature",
    name: "Signature",
    description: "Éditer, parapher, dater et partager des documents avec qui vous voulez",
    href: "/signatures",
    pathPrefixes: ["/signatures"],
    tile: {
      bg: "linear-gradient(145deg, #2a6f97 0%, #1a4a6e 100%)",
      accent: "#7eb8da",
    },
  },
];

export function getProductById(id: ProductId): MegaProduct | undefined {
  return MEGA_PRODUCTS.find((p) => p.id === id);
}

export function getProductForPath(pathname: string): MegaProduct | null {
  if (!pathname || pathname === "/") return null;

  for (const product of MEGA_PRODUCTS) {
    for (const prefix of product.pathPrefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return product;
      }
    }
  }
  return null;
}

export function isAppsLauncherPath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function canSeeProduct(
  product: MegaProduct,
  role: Role | null
): boolean {
  if (product.comingSoon) return true;
  if (!product.roles) return true;
  if (!role) return false;
  return product.roles.includes(role);
}
