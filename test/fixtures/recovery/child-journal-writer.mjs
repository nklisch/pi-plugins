import { createNodeTransitionJournal } from "../../../dist/infrastructure/recovery/sqlite-transition-journal.js";

const hostRoot = process.env.RECOVERY_HOST_ROOT;
const recordJson = process.env.RECOVERY_RECORD_JSON;
if (typeof hostRoot !== "string" || typeof recordJson !== "string") throw new Error("RECOVERY_HOST_ROOT and RECOVERY_RECORD_JSON are required");
const journal = await createNodeTransitionJournal({ hostRoot, verifyLocalFilesystem: async () => {} });
const result = await journal.prepare(JSON.parse(recordJson), new AbortController().signal);
process.stdout.write(`${JSON.stringify(result)}\n`);
if (process.env.RECOVERY_HOLD === "1") await new Promise(() => {});
