import { z } from "zod";

/** Redacted, read-only packaged-host capability evidence. */
export const HostCapabilityStatusSchema = z.object({
  status: z.enum(["available", "unavailable"]),
  explanation: z.string().min(1),
}).strict().readonly();
export type HostCapabilityStatus = z.infer<typeof HostCapabilityStatusSchema>;

export const HostStartupResultSchema = z.object({
  status: z.enum(["ready", "blocked"]),
  blocked: z.array(z.object({ plugin: z.string().min(1), code: z.string().min(1), explanation: z.string().min(1) }).strict().readonly()).readonly(),
  capabilities: z.object({
    mcp: HostCapabilityStatusSchema,
    subagents: HostCapabilityStatusSchema,
    piReload: HostCapabilityStatusSchema,
    secrets: HostCapabilityStatusSchema,
  }).strict().readonly(),
}).strict().readonly();
export type HostStartupResult = z.infer<typeof HostStartupResultSchema>;
