import { describe, it, expect, vi } from "vitest";
import { KVDataEventTarget } from "../src/KVDataEventTarget";

describe("KVDataEventTarget", () => {
  it("should initialize with entries", () => {
    // Simple initialization with string keys
    const simpleStore = new KVDataEventTarget<string, number>([
      ["key1", 100],
      ["key2", 200],
    ]);
    expect(simpleStore.peek("key1")).toBe(100);
    expect(simpleStore.peek("key2")).toBe(200);

    const customStore = new KVDataEventTarget<{ id: string }, string>(
      [
        [{ id: "user1" }, "Alice"],
        [{ id: "user2" }, "Bob"],
      ],
      { getKey: (param) => param.id },
    );
    expect(customStore.peek({ id: "user1" })).toBe("Alice");
    expect(customStore.peek({ id: "user2" })).toBe("Bob");
  });

  it("should return a stable promise per key-value in getAsync", async () => {
    const store = new KVDataEventTarget<string, number>();

    const p1 = store.getAsync("key1");
    const p2 = store.getAsync("key1");
    // Same key, no value yet.
    expect(p1).toBe(p2);

    // Same key, same value.
    store.set("key1", 99);
    const p3 = store.getAsync("key1");
    const p4 = store.getAsync("key1");
    expect(p3).toBe(p4);
    store.set("key1", 99);
    const p5 = store.getAsync("key1");
    expect(p3).toBe(p5);

    // Same key, different value.
    store.set("key1", 101);
    const p6 = store.getAsync("key1");
    expect(p3).not.toBe(p6);
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
      expect.objectContaining({
        detail: { param: "user", key: "user", value: "Alice" },
      }),
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
