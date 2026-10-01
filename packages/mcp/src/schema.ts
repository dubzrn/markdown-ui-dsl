/** The small JSON Schema subset the tool inputs use, and a validator for it (no dependencies). */
export type Schema =
  | { type: "string"; enum?: string[]; maxLength?: number; description?: string; default?: string }
  | { type: "boolean"; description?: string; default?: boolean }
  | { type: "integer"; minimum?: number; maximum?: number; description?: string; default?: number }
  | { type: "array"; items: Schema; maxItems?: number; description?: string }
  | {
      type: "object";
      properties: Record<string, Schema>;
      required?: string[];
      additionalProperties: false;
      description?: string;
    };

/** Returns problems (empty when valid). Unknown properties are rejected. */
export function validate(schema: Schema, value: unknown, path = "arguments"): string[] {
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") return [`${path} must be a string`];
      if (schema.enum !== undefined && !schema.enum.includes(value))
        return [`${path} must be one of ${schema.enum.join(", ")}`];
      if (schema.maxLength !== undefined && value.length > schema.maxLength)
        return [`${path} is longer than ${schema.maxLength} characters`];
      return [];
    case "boolean":
      return typeof value === "boolean" ? [] : [`${path} must be a boolean`];
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value))
        return [`${path} must be an integer`];
      if (schema.minimum !== undefined && value < schema.minimum)
        return [`${path} must be >= ${schema.minimum}`];
      if (schema.maximum !== undefined && value > schema.maximum)
        return [`${path} must be <= ${schema.maximum}`];
      return [];
    case "array": {
      if (!Array.isArray(value)) return [`${path} must be an array`];
      if (schema.maxItems !== undefined && value.length > schema.maxItems)
        return [`${path} has more than ${schema.maxItems} items`];
      return value.flatMap((v, i) => validate(schema.items, v, `${path}[${i}]`));
    }
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value))
        return [`${path} must be an object`];
      const rec = value as Record<string, unknown>;
      const out: string[] = [];
      for (const k of schema.required ?? [])
        if (!Object.hasOwn(rec, k)) out.push(`${path}.${k} is required`);
      for (const k of Object.keys(rec)) {
        if (!Object.hasOwn(schema.properties, k)) out.push(`${path}.${k} is not a known property`);
        else out.push(...validate(schema.properties[k] as Schema, rec[k], `${path}.${k}`));
      }
      return out;
    }
  }
}
