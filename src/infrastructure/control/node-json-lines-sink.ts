import type { Writable } from "node:stream";
import { canonicalJson } from "../../domain/canonical-json.js";
import { NativeControlFrameSchema, NativeControlDeliveryClosedError, type NativeControlFrame } from "../../application/native-control-progress.js";
import type { NativeControlFrameSink } from "../../application/ports/native-control-execution.js";

export type NodeJsonLinesSinkOptions = Readonly<{
  output?: Writable;
}>;

function closed(output: Writable): boolean {
  return output.destroyed || output.writableEnded || output.writableFinished;
}

function writeChunk(output: Writable, chunk: string, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  if (closed(output)) return Promise.reject(new NativeControlDeliveryClosedError());
  return new Promise<void>((resolve, reject) => {
    let waitingDrain = false;
    let settled = false;
    const cleanup = () => {
      output.off("error", onError);
      output.off("close", onClose);
      if (waitingDrain) output.off("drain", onDrain);
      signal.removeEventListener("abort", onAbort);
    };
    const settle = (error?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error === undefined) resolve(); else reject(error);
    };
    const onError = (error: NodeJS.ErrnoException) => settle(error.code === "EPIPE" ? new NativeControlDeliveryClosedError() : error);
    const onClose = () => settle(new NativeControlDeliveryClosedError());
    const onDrain = () => settle();
    const onAbort = () => settle(signal.reason ?? new DOMException("aborted", "AbortError"));
    output.once("error", onError);
    output.once("close", onClose);
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      const ready = output.write(chunk);
      if (ready) settle();
      else {
        waitingDrain = true;
        output.once("drain", onDrain);
      }
    } catch (error) {
      onError(error as NodeJS.ErrnoException);
    }
  });
}

/** Canonical JSON-lines output. close() cleans listeners but never ends stdout. */
export function createNodeJsonLinesSink(options: NodeJsonLinesSinkOptions = {}): NativeControlFrameSink {
  const output = options.output ?? process.stdout;
  let closePromise: Promise<void> | undefined;
  return Object.freeze({
    async write(frameInput: NativeControlFrame, signal: AbortSignal): Promise<void> {
      const frame = NativeControlFrameSchema.parse(frameInput);
      await writeChunk(output, `${canonicalJson(frame)}\n`, signal);
    },
    close() {
      closePromise ??= Promise.resolve();
      return closePromise;
    },
  });
}
