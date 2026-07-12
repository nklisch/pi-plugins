import { describe, expect, it } from "vitest";
import { createBoundedFetch, createNpmCredentialProvider, type BoundedFetchResponse } from "../../../src/infrastructure/http/bounded-fetch.js";

const signal = (): AbortSignal => new AbortController().signal;

function credentials(seen: Headers[]): { apply(url: URL, headers: Headers): void } {
  return {
    apply(_url, headers) {
      headers.set("authorization", "Bearer test-secret");
      seen.push(new Headers(headers));
    },
  };
}

async function collect(response: BoundedFetchResponse): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.body) chunks.push(chunk);
  const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(output);
}

describe("bounded HTTPS fetch", () => {
  it("follows only HTTPS redirects and applies credentials afresh per hop", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const seen: Headers[] = [];
    const fetch = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      requests.push({ url, authorization: new Headers(init?.headers).get("authorization") });
      if (url === "https://registry.example.test/package") {
        return new Response(null, { status: 302, headers: { location: "https://cdn.example.test/package.tgz" } });
      }
      return new Response(new TextEncoder().encode("bytes"), { status: 200 });
    };
    const response = await createBoundedFetch({ fetch, credentials: credentials(seen) }).request({
      url: "https://registry.example.test/package",
      maxBytes: 100,
      signal: signal(),
    });
    expect(await collect(response)).toBe("bytes");
    expect(requests.map((request) => request.url)).toEqual([
      "https://registry.example.test/package",
      "https://cdn.example.test/package.tgz",
    ]);
    expect(requests.every((request) => request.authorization === "Bearer test-secret")).toBe(true);
    expect(seen).toHaveLength(2);
  });

  it("rejects HTTP redirects and enforces streamed byte limits without retaining the body", async () => {
    const fetch = async (): Promise<Response> => new Response(new TextEncoder().encode("too long"), { status: 200 });
    const bounded = createBoundedFetch({ fetch, credentials: { apply() {} } });
    const response = await bounded.request({ url: "https://registry.example.test/package", maxBytes: 3, signal: signal() });
    await expect((async () => { for await (const _chunk of response.body) { /* consume */ } })()).rejects.toMatchObject({ kind: "limit" });

    const httpRedirect = createBoundedFetch({
      fetch: async () => new Response(null, { status: 302, headers: { location: "http://evil.test/package" } }),
      credentials: { apply() {} },
    });
    await expect(httpRedirect.request({ url: "https://registry.example.test/package", maxBytes: 100, signal: signal() })).rejects.toMatchObject({ kind: "redirect" });
  });

  it("matches npm token scopes including ports and reports unreadable config", async () => {
    const provider = createNpmCredentialProvider({
      configText: "//registry.example.test:4873/:_authToken=port-secret\n",
    });
    const portHeaders = new Headers();
    await provider.apply(new URL("https://registry.example.test:4873/package"), portHeaders, signal());
    expect(portHeaders.get("authorization")).toBe("Bearer port-secret");
    const defaultHeaders = new Headers();
    await provider.apply(new URL("https://registry.example.test/package"), defaultHeaders, signal());
    expect(defaultHeaders.get("authorization")).toBeNull();

    const unreadable = createNpmCredentialProvider({ configPath: process.cwd() });
    await expect(unreadable.apply(new URL("https://registry.example.test/package"), new Headers(), signal())).rejects.toMatchObject({ kind: "credential" });
  });

  it("bounds redirect hops", async () => {
    const bounded = createBoundedFetch({
      maxRedirects: 1,
      fetch: async (input) => new Response(null, { status: 302, headers: { location: `${String(input)}-next` } }),
      credentials: { apply() {} },
    });
    await expect(bounded.request({ url: "https://registry.example.test/package", maxBytes: 100, signal: signal() })).rejects.toMatchObject({ kind: "redirect" });
  });
});
