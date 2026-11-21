import { AppError } from "../errors";

type Field = {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean";
  options: string[];
  unit: string | null;
  required: boolean;
};

export type AttributeValue = string | number | boolean | string[];

export type Attribute = {
  fieldId: string;
  label: string;
  unit?: string;
  value: AttributeValue;
};

type Read = { value: AttributeValue } | { error: string };

const isBlank = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

// What the seller sent, in the shape the field stores.
function read(field: Field, raw: unknown): Read {
  switch (field.type) {
    case "text": {
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) return { error: "Enter some text." };
      return text.length <= 200
        ? { value: text }
        : { error: "Use 200 characters or fewer." };
    }
    case "number": {
      const number = typeof raw === "string" ? Number(raw.trim()) : raw;
      return typeof number === "number" &&
        Number.isFinite(number) &&
        number >= 0
        ? { value: number }
        : { error: "Enter a number." };
    }
    case "boolean":
      return typeof raw === "boolean"
        ? { value: raw }
        : { error: "Choose yes or no." };
    case "select":
      return typeof raw === "string" && field.options.includes(raw)
        ? { value: raw }
        : { error: "Choose one of the options." };
    case "multiselect":
      return Array.isArray(raw) &&
        raw.every((item) => field.options.includes(item as string))
        ? { value: [...new Set(raw as string[])] }
        : { error: "Choose from the options." };
  }
}

/**
 * Checks what a seller sent against the fields of the listing's category and
 * returns the attributes to store. Each one keeps the field's label and unit
 * as they were, so a listing still reads right after a field is renamed or
 * removed. Values for fields the category doesn't have are dropped.
 */
export function resolveAttributes(
  fields: Field[],
  values: Record<string, unknown>,
): Attribute[] {
  const errors: Record<string, string> = {};
  const attributes: Attribute[] = [];

  for (const field of fields) {
    const raw = values[field.id];
    const key = `attributes.${field.id}`;

    if (isBlank(raw)) {
      if (field.required) {
        errors[key] = `Enter the ${field.label.toLowerCase()}.`;
      }
      continue;
    }

    const result = read(field, raw);
    if ("error" in result) {
      errors[key] = result.error;
      continue;
    }

    attributes.push({
      fieldId: field.id,
      label: field.label,
      ...(field.unit && { unit: field.unit }),
      value: result.value,
    });
  }

  if (Object.keys(errors).length > 0) {
    throw new AppError("validation", "Check the highlighted fields.", errors);
  }
  return attributes;
}
