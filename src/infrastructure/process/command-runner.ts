import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { redactCommand } from "../logging/redaction.js";

export type CommandRequest = Readonly<{
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string | undefined>>;
  stdin?: AsyncIterable<Uint8Array>;
  stdout: "capture" | "stream";
  maxCapturedBytes: number;
}>;

export type CommandResult = Readonly<{
  /** For live streams this is a provisional value; await completion. */
  exitCode: number;
  stdout: Uint8Array | AsyncIterable<Uint8Array>;
  stderr: Uint8Array;
  completion?: Promise<number>;
}>;

export interface CommandRunner {
  run(request: CommandRequest, signal: AbortSignal): Promise<CommandResult>;
}

export class CommandRunnerError extends Error {
  readonly command: ReturnType<typeof redactCommand>;

  constructor(message: string, executable: string, args: readonly string[], cause?: unknown) {
    super(message, { cause });
    this.name = "CommandRunnerError";
    this.command = redactCommand(executable, args);
  }
}

type RunnerOptions = Readonly<{
  killGraceMs?: number;
}>;

const ABORT_ERROR = (): DOMException => new DOMException("The operation was aborted", "AbortError");

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? ABORT_ERROR();
}

function validateRequest(request: CommandRequest): void {
  if (request === null || typeof request !== "object") throw new TypeError("command request is required");
  if (typeof request.executable !== "string" || request.executable.length === 0) {
    throw new TypeError("command executable must be a non-empty string");
  }
  if (!Array.isArray(request.args) || request.args.some((arg) => typeof arg !== "string")) {
    throw new TypeError("command arguments must be an array of strings");
  }
  if (typeof request.cwd !== "string" || request.cwd.length === 0) throw new TypeError("command cwd must be non-empty");
  if (request.stdout !== "capture" && request.stdout !== "stream") throw new TypeError("command stdout mode is invalid");
  if (!Number.isSafeInteger(request.maxCapturedBytes) || request.maxCapturedBytes <= 0) {
    throw new TypeError("command maxCapturedBytes must be a positive safe integer");
  }
  if (request.stdin !== undefined && (request.stdin === null || typeof request.stdin[Symbol.asyncIterator] !== "function")) {
    throw new TypeError("command stdin must be async iterable");
  }
}

function mergedEnvironment(input: Readonly<Record<string, string | undefined>> | undefined): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined) delete environment[key];
    else environment[key] = value;
  }
  return environment;
}

async function writeStdin(
  child: ChildProcess,
  input: AsyncIterable<Uint8Array>,
  signal: AbortSignal,
  fail: (error: unknown) => void,
): Promise<void> {
  try {
    for await (const chunk of input) {
      throwIfAborted(signal);
      if (!(chunk instanceof Uint8Array)) throw new TypeError("command stdin yielded a non-byte value");
      if (!child.stdin || !child.stdin.writable) throw new Error("command stdin is not writable");
      if (!child.stdin.write(chunk)) await once(child.stdin, "drain");
    }
    child.stdin?.end();
  } catch (error) {
    fail(error);
  }
}

function chunksToBytes(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function chunkStream(chunks: readonly Uint8Array[]): AsyncIterable<Uint8Array> {
  return (async function* () {
    for (const chunk of chunks) yield chunk;
  })();
}

/**
 * A small process port with one intentionally conservative rule: output is
 * drained before the promise settles. This prevents a killed Git process from
 * leaving a pipe writer blocked and makes cancellation cleanup deterministic.
 * The returned stream is a replayable async view over the drained bytes; the
 * archive/tar layer still owns validation and extraction limits.
 */
export function createNodeCommandRunner(options: RunnerOptions = {}): CommandRunner {
  const killGraceMs = options.killGraceMs ?? 5_000;
  if (!Number.isSafeInteger(killGraceMs) || killGraceMs < 0) throw new TypeError("killGraceMs must be a nonnegative safe integer");

  return {
    async run(request, signal) {
      validateRequest(request);
      if (signal === null || typeof signal.aborted !== "boolean") throw new TypeError("command runner requires an AbortSignal");
      throwIfAborted(signal);

      let child: ChildProcess;
      try {
        child = spawn(request.executable, [...request.args], {
          cwd: request.cwd,
          env: mergedEnvironment(request.env),
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
          detached: process.platform !== "win32",
          windowsHide: true,
        });
      } catch (error) {
        throw new CommandRunnerError("command process failed to start", request.executable, request.args, error);
      }
      const stdout = child.stdout;
      const stderr = child.stderr;
      if (stdout === null || stderr === null) {
        child.kill();
        throw new CommandRunnerError("command pipes were not created", request.executable, request.args);
      }
      const stdoutChunks: Uint8Array[] = [];
      const stderrChunks: Uint8Array[] = [];
      let stdoutLength = 0;
      let stderrLength = 0;
      let outputFailure: Error | undefined;
      let processFailure: unknown;
      let abortReason: unknown;
      let closeCode: number | null = null;
      let settled = false;
      let terminationStarted = false;
      let escalationTimer: ReturnType<typeof setTimeout> | undefined;

      const killTree = (kind: "graceful" | "force"): void => {
        const signalName = kind === "graceful" ? "SIGTERM" : "SIGKILL";
        try {
          if (process.platform !== "win32" && child.pid !== undefined) {
            // Detached POSIX children form their own process group. Killing the
            // group prevents Git helpers and archive descendants surviving a
            // cancelled materialization.
            process.kill(-child.pid, signalName);
          } else if (process.platform === "win32" && child.pid !== undefined) {
            spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
              shell: false,
              stdio: "ignore",
              windowsHide: true,
            });
          } else {
            child.kill(signalName);
          }
        } catch {
          try { child.kill(signalName); } catch { /* the close event still drains the pipes */ }
        }
      };

      const terminate = (): void => {
        if (terminationStarted || settled) return;
        terminationStarted = true;
        killTree("graceful");
        if (killGraceMs === 0) {
          killTree("force");
        } else {
          escalationTimer = setTimeout(() => killTree("force"), killGraceMs);
          escalationTimer.unref?.();
        }
      };

      const fail = (error: unknown): void => {
        if (processFailure === undefined) processFailure = error;
        terminate();
      };

      const onAbort = (): void => {
        abortReason = signal.reason ?? ABORT_ERROR();
        terminate();
      };
      signal.addEventListener("abort", onAbort, { once: true });

      if (request.stdout === "stream") {
        stderr.on("data", (value: Buffer) => {
          const remaining = Math.max(0, request.maxCapturedBytes - stderrLength);
          if (remaining === 0) return;
          const chunk = new Uint8Array(value.subarray(0, remaining));
          stderrChunks.push(chunk);
          stderrLength += chunk.byteLength;
        });
        child.on("error", (error) => fail(error));
        const inputPromise = request.stdin === undefined
          ? (child.stdin?.end(), Promise.resolve())
          : writeStdin(child, request.stdin, signal, fail);
        const completion = new Promise<number>((resolve, reject) => {
          child.once("close", (code) => {
            closeCode = code;
            void (async () => {
              try { await inputPromise; }
              catch (error) { if (processFailure === undefined) processFailure = error; }
              settled = true;
              if (escalationTimer !== undefined) clearTimeout(escalationTimer);
              signal.removeEventListener("abort", onAbort);
              if (abortReason !== undefined) reject(abortReason);
              else if (outputFailure !== undefined) reject(new CommandRunnerError(outputFailure.message, request.executable, request.args));
              else if (processFailure !== undefined) reject(new CommandRunnerError("command process failed", request.executable, request.args, processFailure));
              else if (closeCode === null || closeCode !== 0) reject(new CommandRunnerError("command exited with a failure status", request.executable, request.args));
              else resolve(closeCode);
            })();
          });
        });
        const live = (async function* (): AsyncGenerator<Uint8Array> {
          let length = 0;
          let streamEnded = false;
          try {
            for await (const value of stdout) {
              const chunk = value instanceof Uint8Array ? new Uint8Array(value) : undefined;
              if (chunk === undefined) throw new CommandRunnerError("command stdout yielded a non-byte value", request.executable, request.args);
              length += chunk.byteLength;
              if (length > request.maxCapturedBytes) {
                outputFailure = new Error("command stdout exceeded the configured stream limit");
                terminate();
                throw new CommandRunnerError(outputFailure.message, request.executable, request.args);
              }
              yield chunk;
            }
            streamEnded = true;
          } finally {
            // A consumer that abandons the archive must not leave a live Git
            // process writing into an unread pipe. Natural EOF is allowed to
            // reach the close handler and report the real exit status.
            if (!streamEnded && !settled) terminate();
          }
        })();
        return { exitCode: -1, stdout: live, stderr: new Uint8Array(), completion };
      }

      stdout.on("data", (value: Buffer) => {
        // Continue draining after a limit breach, but do not retain further
        // bytes: a hostile process must not turn a bounded capture into an
        // unbounded in-memory queue while it is being terminated.
        if (outputFailure !== undefined) return;
        const chunk = new Uint8Array(value);
        stdoutLength += chunk.byteLength;
        if (stdoutLength > request.maxCapturedBytes) {
          outputFailure = new Error("command stdout exceeded the configured capture limit");
          terminate();
          return;
        }
        stdoutChunks.push(chunk);
      });
      stderr.on("data", (value: Buffer) => {
        // Stderr is retained only as a bounded adapter-local value. Callers
        // must use a redacted diagnostic rather than serializing this buffer.
        const remaining = Math.max(0, request.maxCapturedBytes - stderrLength);
        if (remaining === 0) return;
        const chunk = new Uint8Array(value.subarray(0, remaining));
        stderrChunks.push(chunk);
        stderrLength += chunk.byteLength;
      });
      child.on("error", (error) => fail(error));

      const inputPromise = request.stdin === undefined
        ? (child.stdin?.end(), Promise.resolve())
        : writeStdin(child, request.stdin, signal, fail);

      const result = await new Promise<CommandResult>((resolve, reject) => {
        child.once("close", (code) => {
          closeCode = code;
          void (async () => {
            try { await inputPromise; }
            catch (error) { if (processFailure === undefined) processFailure = error; }
            settled = true;
            if (escalationTimer !== undefined) clearTimeout(escalationTimer);
            signal.removeEventListener("abort", onAbort);
            if (abortReason !== undefined) {
              reject(abortReason);
            } else if (outputFailure !== undefined) {
              reject(new CommandRunnerError(outputFailure.message, request.executable, request.args));
            } else if (processFailure !== undefined) {
              reject(new CommandRunnerError("command process failed", request.executable, request.args, processFailure));
            } else if (closeCode === null) {
              reject(new CommandRunnerError("command exited without a status", request.executable, request.args));
            } else {
              const stderr = chunksToBytes(stderrChunks, stderrLength);
              resolve({
                exitCode: closeCode,
                stdout: request.stdout === "capture"
                  ? chunksToBytes(stdoutChunks, stdoutLength)
                  : chunkStream(stdoutChunks),
                stderr,
              });
            }
          })();
        });
      });
      return result;
    },
  };
}
