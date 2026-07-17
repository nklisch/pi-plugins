import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createNativeControlEnvelope } from "../../../src/application/native-control-contract.js";
import { createNodeJsonLinesSink } from "../../../src/infrastructure/control/node-json-lines-sink.js";

const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;
const frame = { schemaVersion: 1 as const, type: "result" as const, executionId, sequence: 1, result: createNativeControlEnvelope({ executionId, command: "status", status: "ok", data: { z: 1, a: 2 } }) };

describe("node JSON-lines sink", () => {
  it("writes byte-stable canonical JSON plus one newline", async () => {
    const chunks: Buffer[] = [];
    const output = new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
    await createNodeJsonLinesSink({ output }).write(frame, new AbortController().signal);
    const text = Buffer.concat(chunks).toString("utf8");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.indexOf('"a":2')).toBeLessThan(text.indexOf('"z":1'));
    expect(JSON.parse(text)).toMatchObject({ type: "result", result: { status: "ok" } });
  });

  it("awaits drain backpressure and maps EPIPE to closed delivery", async () => {
    const slow = new Writable({ highWaterMark: 1, write(_chunk, _encoding, callback) { setImmediate(callback); } });
    await expect(createNodeJsonLinesSink({ output: slow }).write(frame, new AbortController().signal)).resolves.toBeUndefined();
    const broken = new Writable({ write(_chunk, _encoding, callback) { const error = Object.assign(new Error("secret"), { code: "EPIPE" }); callback(error); } });
    await expect(createNodeJsonLinesSink({ output: broken }).write(frame, new AbortController().signal)).rejects.toMatchObject({ name: "NativeControlDeliveryClosedError" });
  });

  it("does not end the supplied output on close", async () => {
    const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
    const sink = createNodeJsonLinesSink({ output });
    await sink.close();
    expect(output.writableEnded).toBe(false);
  });
});
