import { Prisma } from "@prisma/client";
import { ENCRYPTED_FIELDS, RELATION_MODELS } from "./encryption-extension";

// Both maps are keyed by plain strings, so a renamed model or a mistyped field
// name fails silently: the value is written straight through as plaintext and
// nothing errors. These checks turn that into a failing test instead.

const models = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model])
);

describe("ENCRYPTED_FIELDS", () => {
  it.each(Object.keys(ENCRYPTED_FIELDS))("%s is a real model", (name) => {
    expect(models.has(name)).toBe(true);
  });

  it.each(
    Object.entries(ENCRYPTED_FIELDS).flatMap(([model, fields]) =>
      fields.map((field) => [model, field] as const)
    )
  )("%s.%s is a String scalar", (model, field) => {
    const found = models.get(model)?.fields.find((f) => f.name === field);

    expect(found).toBeDefined();
    expect(found?.kind).toBe("scalar");
    // Encrypting writes a prefixed base64 string back, so the column has to be
    // a String. A DateTime or Int target would fail only at runtime.
    expect(found?.type).toBe("String");
  });
});

describe("RELATION_MODELS", () => {
  it.each(Object.entries(RELATION_MODELS))(
    "%s points at real model %s",
    (_key, model) => {
      expect(models.has(model)).toBe(true);
    }
  );

  // The map is flat, so one relation name cannot mean two different models.
  it("has no relation key that resolves to more than one model", () => {
    const ambiguous: string[] = [];

    for (const [key, mapped] of Object.entries(RELATION_MODELS)) {
      const targets = new Set(
        Prisma.dmmf.datamodel.models.flatMap((model) =>
          model.fields
            .filter((f) => f.name === key && f.kind === "object")
            .map((f) => f.type)
        )
      );

      if (targets.size > 1)
        ambiguous.push(`${key} -> ${[...targets].join(", ")}`);
      if (targets.size === 1 && !targets.has(mapped)) {
        ambiguous.push(
          `${key} mapped to ${mapped} but schema says ${[...targets][0]}`
        );
      }
    }

    expect(ambiguous).toEqual([]);
  });

  // A model can only be reached through a nested include if its relation key is
  // mapped, so every encrypted model that is ever nested needs an entry.
  it("covers every encrypted model reachable as a relation", () => {
    const mapped = new Set(Object.values(RELATION_MODELS));
    const missing: string[] = [];

    for (const name of Object.keys(ENCRYPTED_FIELDS)) {
      const nestable = Prisma.dmmf.datamodel.models.some((model) =>
        model.fields.some((f) => f.kind === "object" && f.type === name)
      );

      if (nestable && !mapped.has(name)) missing.push(name);
    }

    expect(missing).toEqual([]);
  });
});
