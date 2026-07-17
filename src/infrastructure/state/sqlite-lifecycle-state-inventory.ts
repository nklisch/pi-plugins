/**
 * Inventory is opened by the lifecycle-state adapter so discovery and reads
 * share protocol, path-identity, corruption, and close semantics. Keeping this
 * module as the stable import point avoids a second SQLite authority.
 */
export {
  createNodeLifecycleStateAdapters,
  type NodeLifecycleStateAdapters,
} from "./sqlite-lifecycle-state-store.js";
