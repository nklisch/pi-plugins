import { copyFile, mkdtemp, rename, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  createSqliteScopeLockManager,
  scopeDatabaseName,
} from "../../../src/infrastructure/state/sqlite-scope-lock.js";
import { BoundaryError } from "../../../src/domain/errors.js";
import type { ScopeReference } from "../../../src/domain/state/scope.js";

const user: ScopeReference = { kind: "user" };
const project: ScopeReference = {
  kind: "project",
  projectKey: `project-v1:sha256:${"b".repeat(64)}` as never,
};
const child = resolve(process.cwd(), "test/fixtures/locking/child-lock-holder.mjs");

async function root(): Promise<string> {
  return mkdtemp(join(process.cwd(), ".test-scope-lock-"));
}

async function manager(lockRoot: string) {
  return createSqliteScopeLockManager({
    lockRoot,
    retryDelayMs: { minimum: 1, maximum: 2 },
    verifyLocalFilesystem: async () => {},
  });
}

async function waitForExit(childProcess: ChildProcessWithoutNullStreams): Promise<void> {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) return;
  await new Promise<void>((resolvePromise) => childProcess.once("close", () => resolvePromise()));
}

describe("SQLite scope lock adapter", () => {
  it("exercises the default platform/filesystem capability gate", async () => {
    const lockRoot = await root();
    try {
      const result = await createSqliteScopeLockManager({
        lockRoot,
        retryDelayMs: { minimum: 1, maximum: 1 },
      }).catch((error: unknown) => error);
      if (result instanceof BoundaryError) {
        expect(result.code).toBe("ADAPTER_FAILED");
      } else {
        const lease = await (result as Awaited<ReturnType<typeof createSqliteScopeLockManager>>).acquire(user, new AbortController().signal);
        await lease.release();
      }
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("uses fixed scope names and permits independent scopes", async () => {
    const lockRoot = await root();
    try {
      expect(scopeDatabaseName(user)).toBe("user.sqlite");
      expect(scopeDatabaseName(project)).toBe(`project-project-v1%3Asha256%3A${"b".repeat(64)}.sqlite`);
      const locks = await manager(lockRoot);
      const userLease = await locks.acquire(user, new AbortController().signal);
      const projectLease = await locks.acquire(project, new AbortController().signal);
      await Promise.all([userLease.release(), projectLease.release()]);
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("does not let a paused child owner expire, then acquires after SIGKILL", async () => {
    const lockRoot = await root();
    const dbPath = join(lockRoot, "user.sqlite");
    const locks = await manager(lockRoot);
    const initialized = await locks.acquire(user, new AbortController().signal);
    await initialized.release();
    const holder = spawn(process.execPath, [child, dbPath], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_OPTIONS: "", VITEST: undefined },
      stdio: ["pipe", "pipe", "ignore"],
    });
    try {
      await new Promise<void>((resolvePromise, reject) => {
        holder.stdout.once("data", () => resolvePromise());
        holder.once("error", reject);
        holder.once("exit", (code, signal) => reject(new Error(`lock holder exited before ready: ${code ?? signal}`)));
      });
      const controller = new AbortController();
      const reason = new Error("caller deadline");
      const waiting = locks.acquire(user, controller.signal);
      setTimeout(() => controller.abort(reason), 10);
      await expect(waiting).rejects.toBe(reason);
      expect(holder.exitCode).toBeNull();
      holder.kill("SIGKILL");
      await waitForExit(holder);

      const lease = await locks.acquire(user, new AbortController().signal);
      await lease.release();
    } finally {
      if (holder.exitCode === null) holder.kill("SIGKILL");
      await waitForExit(holder);
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("never recreates a previously initialized missing database", async () => {
    const lockRoot = await root();
    try {
      const locks = await manager(lockRoot);
      const lease = await locks.acquire(user, new AbortController().signal);
      await lease.release();
      await rm(join(lockRoot, "user.sqlite"));
      await expect(locks.acquire(user, new AbortController().signal)).rejects.toBeInstanceOf(BoundaryError);
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("fails closed when a previously initialized database path is replaced", async () => {
    const lockRoot = await root();
    try {
      const locks = await manager(lockRoot);
      const lease = await locks.acquire(user, new AbortController().signal);
      const replacement = join(lockRoot, "replacement.sqlite");
      await copyFile(join(lockRoot, "user.sqlite"), replacement);
      await rm(join(lockRoot, "user.sqlite"));
      await rename(replacement, join(lockRoot, "user.sqlite"));
      await expect(lease.assertOwned(new AbortController().signal)).rejects.toBeInstanceOf(BoundaryError);
      await lease.release();
      await expect(locks.acquire(user, new AbortController().signal)).rejects.toBeInstanceOf(BoundaryError);
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("releases idempotently and keeps the scope reusable", async () => {
    const lockRoot = await root();
    try {
      const locks = await manager(lockRoot);
      const lease = await locks.acquire(user, new AbortController().signal);
      await lease.release();
      await lease.release();
      const second = await locks.acquire(user, new AbortController().signal);
      await second.release();
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("fails closed for capability and symlink failures", async () => {
    const lockRoot = await root();
    const link = `${lockRoot}-link`;
    try {
      const capabilityFailure = await createSqliteScopeLockManager({
        lockRoot,
        retryDelayMs: { minimum: 1, maximum: 1 },
        verifyLocalFilesystem: async () => { throw new Error("network filesystem"); },
      }).catch((error: unknown) => error);
      expect(capabilityFailure).toBeInstanceOf(BoundaryError);
      expect((capabilityFailure as BoundaryError).code).toBe("ADAPTER_FAILED");
      await symlink(lockRoot, link);
      const symlinkFailure = await createSqliteScopeLockManager({
        lockRoot: link,
        retryDelayMs: { minimum: 1, maximum: 1 },
        verifyLocalFilesystem: async () => {},
      }).catch((error: unknown) => error);
      expect(symlinkFailure).toBeInstanceOf(BoundaryError);
      expect((symlinkFailure as BoundaryError).code).toBe("ADAPTER_FAILED");
    } finally {
      await rm(link, { recursive: true, force: true });
      await rm(lockRoot, { recursive: true, force: true });
    }
  });
});
