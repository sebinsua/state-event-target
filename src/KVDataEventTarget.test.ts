import { describe, it, expect, vi } from "vitest";
import { KVDataEventTarget } from "../src/KVDataEventTarget";

describe("KVDataEventTarget", () => {
  it("should return a stable promise per key in getAsync", async () => {
    const store = new KVDataEventTarget<string, number>();

    const p1 = store.getAsync("key1");
    const p2 = store.getAsync("key1");
    // Same promise for same key
    expect(p1).toBe(p2);

    store.set("key1", 99);
    const value = await p1;
    expect(value).toBe(99);

    const p3 = store.getAsync("key1");
    // Must return the resolved promise
    expect(p3).toBe(p1);
  });

  it("should resolve getAsync() when value is set", async () => {
    const store = new KVDataEventTarget<string, string>();

    const promise = store.getAsync("keyX");
    store.set("keyX", "loaded");

    await expect(promise).resolves.toBe("loaded");
  });

  it("should return a value synchronously after it is set", () => {
    const store = new KVDataEventTarget<string, boolean>();

    store.set("isReady", true);
    expect(store.read("isReady")).toBe(true);
    expect(store.peek("isReady")).toBe(true);
  });

  it("should emit 'state:update' when a key is set", () => {
    const store = new KVDataEventTarget<string, string>();
    const callback = vi.fn();

    store.addEventListener("state:update", callback);
    store.set("user", "Alice");

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { key: "user", value: "Alice" } }),
    );
  });

  it("should clear all values and pending promises on clear()", async () => {
    const store = new KVDataEventTarget<string, number>();

    store.set("score", 42);
    expect(store.read("score")).toBe(42);

    store.clear();
    expect(store.peek("score")).toBe(undefined);

    const promise = store.getAsync("score");
    expect(promise).not.toBeUndefined();

    store.set("score", 100);
    await expect(promise).resolves.toBe(100);
  });

  it("should remove all pending resolvers on destroy", async () => {
    const store = new KVDataEventTarget<string, number>();

    const promise = store.getAsync("count");
    store.destroy();

    store.set("count", 999);
    // Should NOT resolve since it's destroyed
    await expect(
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(reject, 50)),
      ]),
    ).rejects.toBeUndefined();
  });
});
