import { describe, expect, it } from "vitest";
import {
  canApproveCeo,
  canImport,
  canManageUsers,
  canValidate,
  canWrite,
} from "@/lib/roles";

describe("roles", () => {
  it("LECTURE_SEULE ne peut pas écrire", () => {
    expect(canWrite("LECTURE_SEULE")).toBe(false);
    expect(canImport("LECTURE_SEULE")).toBe(false);
  });

  it("COMPTABLE peut écrire et importer", () => {
    expect(canWrite("COMPTABLE")).toBe(true);
    expect(canImport("COMPTABLE")).toBe(true);
    expect(canManageUsers("COMPTABLE")).toBe(false);
  });

  it("ADMIN gère les utilisateurs", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
  });

  it("CEO peut approuver", () => {
    expect(canApproveCeo("CEO")).toBe(true);
    expect(canManageUsers("CEO")).toBe(false);
  });
});
