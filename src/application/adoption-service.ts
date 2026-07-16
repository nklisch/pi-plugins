import {
  AdoptionDocumentKindRegistry,
  adoptionDocumentHosts,
  type AdoptionCandidate,
  type AdoptionDocumentKind,
  reconcileAdoptionDeclarations,
} from "../domain/adoption.js";
import { DiagnosticSchema, ErrorCodeRegistry, type Diagnostic } from "../domain/error-contract.js";
import { createScopeContext, ScopeContextSchema, type ScopeContext } from "../domain/state/scope.js";
import {
  ForeignStateFileObservationSchema,
  AdoptionDiscoveryResultSchema,
  AdoptionDocumentStatusSchema,
  AdoptionImportResultSchema,
  AdoptionSelectionRequestSchema,
  MarketplaceRegistrationResultSchema,
  type AdoptionDiscoveryResult,
  type AdoptionImportResult,
  type AdoptionReaderRegistry,
  type AdoptionSelectionRequest,
  type ForeignStateFileObservation,
} from "./adoption-contract.js";
import type { ForeignStateFilesPort } from "./ports/foreign-state-files.js";
import type { MarketplaceRegistrationPort } from "./ports/marketplace-registration.js";
import type { Sha256 } from "../domain/source.js";
import { PortableMarketplaceSourceSchema } from "../domain/state/portable-project-declaration.js";

const DOCUMENTS = Object.values(AdoptionDocumentKindRegistry);

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (typeof signal.throwIfAborted === "function") signal.throwIfAborted();
  const error = new Error("Adoption operation was aborted");
  error.name = "AbortError";
  throw error;
}

function adapterDiagnostic(message: string, details?: Record<string, string>): Diagnostic {
  return DiagnosticSchema.parse({
    code: ErrorCodeRegistry.adapterFailed,
    severity: "error",
    operation: "discoverAdoption",
    message,
    ...(details === undefined ? {} : { details }),
  });
}

function unreadableDiagnostic(observation: Extract<ForeignStateFileObservation, { kind: "unreadable" }>): Diagnostic {
  return adapterDiagnostic("Foreign-state document could not be read", {
    document: observation.document,
    reason: observation.code,
  });
}

function statusFromObservation(observation: ForeignStateFileObservation) {
  switch (observation.kind) {
    case "missing":
      return AdoptionDocumentStatusSchema.parse(observation);
    case "present":
      return AdoptionDocumentStatusSchema.parse({
        kind: observation.kind,
        document: observation.document,
        host: observation.host,
        path: observation.path,
      });
    case "unreadable":
      return AdoptionDocumentStatusSchema.parse(observation);
  }
}

function validateObservation(value: unknown): ForeignStateFileObservation | undefined {
  const parsed = ForeignStateFileObservationSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function expectedDocumentKinds(): readonly AdoptionDocumentKind[] {
  return DOCUMENTS.map((entry) => entry.tag);
}

function candidateIndex(candidates: readonly AdoptionCandidate[]): Map<string, AdoptionCandidate> {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

export interface AdoptionService {
  discover(signal: AbortSignal): Promise<AdoptionDiscoveryResult>;
  adopt(request: AdoptionSelectionRequest, signal: AbortSignal): Promise<AdoptionImportResult>;
}

export type AdoptionServiceDependencies = Readonly<{
  files: ForeignStateFilesPort;
  readers: AdoptionReaderRegistry;
  registrations: MarketplaceRegistrationPort;
  sha256: Sha256;
}>;

export function createAdoptionService(
  dependencies: AdoptionServiceDependencies,
): AdoptionService {
  if (typeof dependencies.sha256 !== "function") throw new TypeError("adoption service requires SHA-256");

  async function discover(signal: AbortSignal): Promise<AdoptionDiscoveryResult> {
    throwIfAborted(signal);
    const rawObservations = await dependencies.files.readAll(signal);
    throwIfAborted(signal);
    const observations = new Map<AdoptionDocumentKind, ForeignStateFileObservation>();
    const diagnostics: Diagnostic[] = [];
    for (const raw of rawObservations) {
      const observation = validateObservation(raw);
      if (observation === undefined) {
        diagnostics.push(adapterDiagnostic("Foreign-state adapter returned an invalid observation"));
        continue;
      }
      const expectedHost = adoptionDocumentHosts[observation.document];
      if (expectedHost !== observation.host) {
        diagnostics.push(adapterDiagnostic("Foreign-state adapter returned a mismatched host", {
          document: observation.document,
        }));
        continue;
      }
      if (observations.has(observation.document)) {
        diagnostics.push(adapterDiagnostic("Foreign-state adapter returned a duplicate document", {
          document: observation.document,
        }));
        continue;
      }
      observations.set(observation.document, observation);
    }

    const declarations = [] as import("../domain/adoption.js").AdoptionDeclaration[];
    const statuses = [] as import("./adoption-contract.js").AdoptionDocumentStatus[];
    for (const document of expectedDocumentKinds()) {
      const observation = observations.get(document);
      if (observation === undefined) {
        // A compliant adapter always returns all fixed paths. Treat an omitted
        // record as a safe adapter failure rather than fabricating a missing
        // path or searching for a replacement.
        statuses.push(AdoptionDocumentStatusSchema.parse({
          kind: "unreadable",
          document,
          host: adoptionDocumentHosts[document],
          path: "<unreported>",
          code: "IO_FAILED",
        }));
        diagnostics.push(adapterDiagnostic("Foreign-state adapter omitted a fixed document", { document }));
        continue;
      }
      statuses.push(statusFromObservation(observation));
      if (observation.kind === "unreadable") {
        diagnostics.push(unreadableDiagnostic(observation));
        continue;
      }
      if (observation.kind === "missing") continue;
      const reader = dependencies.readers[observation.document];
      if (reader === undefined) {
        diagnostics.push(adapterDiagnostic("No reader is registered for a foreign-state document", { document: observation.document }));
        continue;
      }
      try {
        const result = reader(observation.source, { path: observation.path });
        declarations.push(...result.items);
        diagnostics.push(...result.diagnostics);
      } catch {
        // Readers are pure boundaries, but a malformed injected registry must
        // not leak a parser/native cause through the application result.
        diagnostics.push(adapterDiagnostic("Foreign-state reader failed safely", { document: observation.document }));
      }
    }
    const reconciled = reconcileAdoptionDeclarations(declarations, dependencies.sha256);
    diagnostics.push(...reconciled.diagnostics);
    return AdoptionDiscoveryResultSchema.parse({
      candidates: reconciled.items,
      documents: statuses,
      diagnostics,
    });
  }

  async function adopt(request: AdoptionSelectionRequest, signal: AbortSignal): Promise<AdoptionImportResult> {
    throwIfAborted(signal);
    const parsedRequest = AdoptionSelectionRequestSchema.parse(request);
    const scope = createScopeContext(ScopeContextSchema.parse(parsedRequest.scope), dependencies.sha256);
    const discovery = await discover(signal);
    const candidates = candidateIndex(discovery.candidates);
    const outcomes: Array<AdoptionImportResult["outcomes"][number]> = [];
    const ids = [...parsedRequest.candidateIds].sort();

    for (const candidateId of ids) {
      throwIfAborted(signal);
      const candidate = candidates.get(candidateId);
      if (candidate === undefined) {
        outcomes.push({ candidateId, outcome: { kind: "candidate-unavailable" } });
        continue;
      }
      if (scope.kind === "project" && !PortableMarketplaceSourceSchema.safeParse(candidate.source.value).success) {
        outcomes.push({ candidateId, outcome: { kind: "not-portable" } });
        continue;
      }
      const registrationRequest = {
        source: candidate.source.value,
        scope,
        origin: "adoption" as const,
      };
      try {
        const result = await dependencies.registrations.register(registrationRequest, signal);
        throwIfAborted(signal);
        const parsedResult = MarketplaceRegistrationResultSchema.safeParse(result);
        outcomes.push({
          candidateId,
          outcome: parsedResult.success
            ? parsedResult.data
            : { kind: "rejected", code: "ADAPTER_FAILED" },
        });
      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
        outcomes.push({ candidateId, outcome: { kind: "rejected", code: "ADAPTER_FAILED" } });
      }
    }

    return AdoptionImportResultSchema.parse({
      outcomes,
      diagnostics: discovery.diagnostics,
    });
  }

  return { discover, adopt };
}
