import { z } from "zod";

export const NativeHostSchema = z.enum(["claude", "codex"]);
export type NativeHost = z.infer<typeof NativeHostSchema>;

export const SourceDocumentKindSchema = z.enum([
  "marketplace",
  "manifest",
  "hooks",
  "mcp",
  "skill",
  "convention",
]);
export type SourceDocumentKind = z.infer<typeof SourceDocumentKindSchema>;

export const SourceLocationSchema = z
  .object({
    host: NativeHostSchema,
    documentKind: SourceDocumentKindSchema,
    path: z.string().min(1),
    // RFC 6901 uses the empty string for the document root. A non-root
    // pointer must begin with `/`; `/` addresses an empty property name.
    pointer: z.string().refine(
      (value) => value === "" || value.startsWith("/"),
      "JSON Pointer must be empty for the document root or begin with `/`",
    ).optional(),
    line: z.number().int().positive().optional(),
    column: z.number().int().positive().optional(),
  })
  .strict()
  .readonly();
export type SourceLocation = z.infer<typeof SourceLocationSchema>;
