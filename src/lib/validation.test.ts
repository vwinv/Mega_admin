import { describe, expect, it } from "vitest";
import { montantOperationInchange, parseMontant } from "@/lib/validation";

describe("validation", () => {
  it("parseMontant gère espaces et virgules", () => {
    expect(parseMontant("1 300 000")).toBe(1300000);
    expect(parseMontant("500,000")).toBe(500000);
  });

  it("montantOperationInchange détecte un montant identique", () => {
    const existing = { entree: null, sortie: 250000 };
    expect(
      montantOperationInchange(existing, {
        date: "",
        numeroPiece: "",
        libelle: "Test",
        categorieId: "x",
        codeBudgetaireId: "y",
        montantType: "sortie",
        montant: 250000,
        observations: "",
        validePar: "",
      })
    ).toBe(true);
  });
});
