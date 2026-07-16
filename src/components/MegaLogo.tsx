/** Dimensions réelles de Mega logo 1.png / logo-ivory */
const LOGO_W = 393;
const LOGO_H = 88;

export function MegaLogo({
  className = "",
  width = 196,
  priority = false,
  variant = "default",
}: {
  className?: string;
  /** Largeur d'affichage en px (hauteur calculée automatiquement) */
  width?: number;
  priority?: boolean;
  /** ivory = logo clair pour fonds sombres (sidebar / login) */
  variant?: "default" | "ivory";
}) {
  const height = Math.round((width * LOGO_H) / LOGO_W);
  const src =
    variant === "ivory" ? "/mega-logo-ivory.png" : "/mega-logo.png";

  return (
    // img natif : ratio exact, transparence PNG, pas de crop Next/Image
    <img
      src={src}
      alt="MEGA"
      width={width}
      height={height}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`block h-auto max-w-full shrink-0 object-contain object-left ${className}`}
      style={{ width, aspectRatio: `${LOGO_W} / ${LOGO_H}` }}
    />
  );
}
