import { describe, expect, it } from "vitest";
import { resolveStatutEcheance, isEcheanceEnRetard } from "@/lib/impots-statut";

describe("resolveStatutEcheance", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");

  it("retourne Payé si déjà payé", () => {
    expect(
      resolveStatutEcheance("Payé", new Date("2026-01-01"), now)
    ).toBe("Payé");
  });

  it("retourne En retard si échéance passée", () => {
    expect(
      resolveStatutEcheance("En attente", new Date("2026-06-01"), now)
    ).toBe("En retard");
  });

  it("retourne En attente si échéance future", () => {
    expect(
      resolveStatutEcheance("En attente", new Date("2026-12-31"), now)
    ).toBe("En attente");
  });

  it("isEcheanceEnRetard est cohérent", () => {
    expect(
      isEcheanceEnRetard("En attente", new Date("2026-06-01"), now)
    ).toBe(true);
    expect(
      isEcheanceEnRetard("Payé", new Date("2026-06-01"), now)
    ).toBe(false);
  });
});
