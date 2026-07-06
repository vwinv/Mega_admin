export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatFcfaLabel(amount: number, devise = "FCFA"): string {
  return `${formatFcfa(amount)} ${devise}`;
}
