import type { CanonicalConfigurationPath } from "../../domain/configured-values.js";
import type { ScopeContext } from "../../domain/state/scope.js";

export type ConfigurationPathContext = Readonly<{
  scope: ScopeContext;
  trustedBaseDirectory: string;
}>;

export interface ConfigurationPathPort {
  normalizeAndInspect(
    input: Readonly<{
      value: string;
      expected: "file" | "directory";
      mustExist: boolean;
      context: ConfigurationPathContext;
    }>,
    signal: AbortSignal,
  ): Promise<
    | Readonly<{ kind: "valid"; canonicalPath: CanonicalConfigurationPath }>
    | Readonly<{ kind: "missing" | "wrong-kind" | "invalid" }>
  >;
}
