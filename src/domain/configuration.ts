import { z } from "zod";
import { schemaValues } from "./schema.js";
import { ClaimedSchema, ProvenanceSchema } from "./provenance.js";

/** The public configuration vocabulary has one authoritative registry. */
export const ConfigurationValueKindRegistry = {
  string: { tag: "string" },
  number: { tag: "number" },
  boolean: { tag: "boolean" },
  directory: { tag: "directory" },
  file: { tag: "file" },
  strings: { tag: "strings" },
} as const;

const ConfigurationValueSchemaRegistry = {
  string: z
    .object({
      kind: z.literal(ConfigurationValueKindRegistry.string.tag),
      default: z.string().optional(),
      pattern: z.string().optional(),
    })
    .strict(),
  number: z
    .object({
      kind: z.literal(ConfigurationValueKindRegistry.number.tag),
      default: z.number().finite().optional(),
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
    })
    .strict(),
  boolean: z
    .object({
      kind: z.literal(ConfigurationValueKindRegistry.boolean.tag),
      default: z.boolean().optional(),
    })
    .strict(),
  directory: z
    .object({
      kind: z.literal(ConfigurationValueKindRegistry.directory.tag),
      default: z.string().optional(),
      mustExist: z.boolean().default(true),
    })
    .strict(),
  file: z
    .object({
      kind: z.literal(ConfigurationValueKindRegistry.file.tag),
      default: z.string().optional(),
      mustExist: z.boolean().default(true),
    })
    .strict(),
  strings: z
    .object({
      kind: z.literal(ConfigurationValueKindRegistry.strings.tag),
      default: z.array(z.string()).readonly().optional(),
      minItems: z.number().int().nonnegative().optional(),
      maxItems: z.number().int().nonnegative().optional(),
    })
    .strict(),
} as const satisfies Record<
  keyof typeof ConfigurationValueKindRegistry,
  z.ZodTypeAny
>;

const ConfigurationValueUnionSchema = z.discriminatedUnion(
  "kind",
  schemaValues(ConfigurationValueSchemaRegistry),
);
type ConfigurationValueDescriptor = z.infer<typeof ConfigurationValueUnionSchema>;

export const ConfigurationKeySchema = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

function hasDefault(value: ConfigurationValueDescriptor): boolean {
  return "default" in value && value.default !== undefined;
}

function addIssue(
  context: z.RefinementCtx,
  path: (string | number)[],
  message: string,
): void {
  context.addIssue({ code: "custom", path, message });
}

function validatePattern(
  value: Extract<ConfigurationValueDescriptor, { kind: "string" }>,
  context: z.RefinementCtx,
  pathPrefix: readonly (string | number)[],
): void {
  if (value.pattern === undefined) {
    return;
  }

  try {
    // Validate the descriptor now rather than failing when a configured value
    // is eventually substituted into a component.
    new RegExp(value.pattern);
  } catch {
    addIssue(
      context,
      [...pathPrefix, "pattern"],
      "pattern must be a valid regular expression",
    );
  }
}

function validateNumberBounds(
  value: Extract<ConfigurationValueDescriptor, { kind: "number" }>,
  context: z.RefinementCtx,
  pathPrefix: readonly (string | number)[],
): void {
  if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
    addIssue(context, [...pathPrefix, "min"], "min must not exceed max");
  }
  if (value.default !== undefined && value.min !== undefined && value.default < value.min) {
    addIssue(context, [...pathPrefix, "default"], "default must be at least min");
  }
  if (value.default !== undefined && value.max !== undefined && value.default > value.max) {
    addIssue(context, [...pathPrefix, "default"], "default must be at most max");
  }
}

function validateStringBounds(
  value: Extract<ConfigurationValueDescriptor, { kind: "strings" }>,
  context: z.RefinementCtx,
  pathPrefix: readonly (string | number)[],
): void {
  if (
    value.minItems !== undefined &&
    value.maxItems !== undefined &&
    value.minItems > value.maxItems
  ) {
    addIssue(context, [...pathPrefix, "minItems"], "minItems must not exceed maxItems");
  }
  if (
    value.default !== undefined &&
    value.minItems !== undefined &&
    value.default.length < value.minItems
  ) {
    addIssue(context, [...pathPrefix, "default"], "default contains fewer than minItems values");
  }
  if (
    value.default !== undefined &&
    value.maxItems !== undefined &&
    value.default.length > value.maxItems
  ) {
    addIssue(context, [...pathPrefix, "default"], "default contains more than maxItems values");
  }
}

function validateValueDescriptor(
  value: ConfigurationValueDescriptor,
  context: z.RefinementCtx,
  pathPrefix: readonly (string | number)[],
): void {
  switch (value.kind) {
    case "string":
      validatePattern(value, context, pathPrefix);
      break;
    case "number":
      validateNumberBounds(value, context, pathPrefix);
      break;
    case "strings":
      validateStringBounds(value, context, pathPrefix);
      break;
    case "boolean":
    case "directory":
    case "file":
      break;
    default:
      assertNever(value);
  }
}

export const ConfigurationValueSchema = ConfigurationValueUnionSchema.superRefine(
  (value, context) => validateValueDescriptor(value, context, []),
);
export type ConfigurationValue = z.infer<typeof ConfigurationValueSchema>;
export type ConfigurationValueKind = ConfigurationValue["kind"];

export const ConfigurationOptionSchema = z
  .object({
    key: ConfigurationKeySchema,
    label: ClaimedSchema(z.string().min(1)),
    description: ClaimedSchema(z.string()).optional(),
    value: ConfigurationValueSchema,
    required: z.boolean(),
    sensitive: z.boolean(),
    provenance: z.array(ProvenanceSchema).nonempty().readonly(),
  })
  .strict()
  .readonly()
  .superRefine((option, context) => {
    if (option.sensitive && hasDefault(option.value)) {
      addIssue(
        context,
        ["value", "default"],
        "sensitive configuration descriptors cannot carry default values",
      );
    }
  });
export type ConfigurationOption = z.infer<typeof ConfigurationOptionSchema>;

export const PluginConfigurationSchema = z
  .object({
    options: z.array(ConfigurationOptionSchema).readonly(),
  })
  .strict()
  .readonly()
  .superRefine((configuration, context) => {
    const firstByKey = new Map<string, number>();
    configuration.options.forEach((option, index) => {
      const firstIndex = firstByKey.get(option.key);
      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "key"],
          message: `duplicate configuration key; first declared at index ${firstIndex}`,
        });
      } else {
        firstByKey.set(option.key, index);
      }
    });
  });
export type PluginConfiguration = z.infer<typeof PluginConfigurationSchema>;

function assertNever(value: never): never {
  throw new Error(`Unhandled configuration value kind: ${String(value)}`);
}
