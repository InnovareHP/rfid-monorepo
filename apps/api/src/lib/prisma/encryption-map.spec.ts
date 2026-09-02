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

  // The map is flat, so one relation name cannot mean two encrypted models.
  // A key shared with models that encrypt nothing is harmless: the extension
  // resolves it to the mapped model and looks for that model's encrypted
  // columns, which the others do not have. That stops being true the moment a
  // sibling gains a column of the same name, which is what this checks.
  it("has no relation key that resolves to more than one encrypted model", () => {
    const ambiguous: string[] = [];

    for (const [key, mapped] of Object.entries(RELATION_MODELS)) {
      const targets = [
        ...new Set(
          Prisma.dmmf.datamodel.models.flatMap((model) =>
            model.fields
              .filter((f) => f.name === key && f.kind === "object")
              .map((f) => f.type)
          )
        ),
      ];

      if (targets.length === 1 && targets[0] !== mapped) {
        ambiguous.push(
          `${key} mapped to ${mapped} but schema says ${targets[0]}`
        );
        continue;
      }

      if (targets.length <= 1) continue;
      if (!targets.includes(mapped)) {
        ambiguous.push(`${key} -> ${targets.join(", ")}, none is ${mapped}`);
        continue;
      }

      const encryptedSiblings = targets.filter(
        (target) => target !== mapped && target in ENCRYPTED_FIELDS
      );
      if (encryptedSiblings.length > 0) {
        ambiguous.push(
          `${key} -> ${mapped} and encrypted ${encryptedSiblings.join(", ")}`
        );
        continue;
      }

      // The mapped model's encrypted columns must not exist on a sibling, or
      // the extension would encrypt that sibling's column by accident.
      const guarded = ENCRYPTED_FIELDS[mapped] ?? [];
      for (const target of targets) {
        if (target === mapped) continue;

        const clashing = (models.get(target)?.fields ?? [])
          .filter((f) => guarded.includes(f.name))
          .map((f) => f.name);

        if (clashing.length > 0) {
          ambiguous.push(
            `${key} -> ${target} shares encrypted column(s) ${clashing.join(", ")} with ${mapped}`
          );
        }
      }
    }

    expect(ambiguous).toEqual([]);
  });

  // Notification is reachable only through the key `notifications`, which also
  // names BoardNotificationState on Board. A flat map cannot let one key mean two
  // models, and nothing writes Notification nested, so ENCRYPTED_FIELDS protects
  // its only real write path. Renaming the Board relation would free the key.
  const UNMAPPABLE = new Set(["Notification"]);

  // A model can only be reached through a nested include if its relation key is
  // mapped, so every encrypted model that is ever nested needs an entry.
  it("covers every encrypted model reachable as a relation", () => {
    const mapped = new Set(Object.values(RELATION_MODELS));
    const missing: string[] = [];

    for (const name of Object.keys(ENCRYPTED_FIELDS)) {
      const nestable = Prisma.dmmf.datamodel.models.some((model) =>
        model.fields.some((f) => f.kind === "object" && f.type === name)
      );

      if (nestable && !mapped.has(name) && !UNMAPPABLE.has(name)) {
        missing.push(name);
      }
    }

    expect(missing).toEqual([]);
  });

  // Guards the exception itself: if the colliding relation is ever renamed, the
  // key frees up and Notification should be mapped rather than excused.
  it("keeps the unmappable list justified by an actual collision", () => {
    for (const name of UNMAPPABLE) {
      const keys = Prisma.dmmf.datamodel.models.flatMap((model) =>
        model.fields
          .filter((f) => f.kind === "object" && f.type === name)
          .map((f) => f.name)
      );

      const stillAmbiguous = keys.some(
        (key) =>
          new Set(
            Prisma.dmmf.datamodel.models.flatMap((model) =>
              model.fields
                .filter((f) => f.name === key && f.kind === "object")
                .map((f) => f.type)
            )
          ).size > 1
      );

      expect(stillAmbiguous).toBe(true);
    }
  });
});
