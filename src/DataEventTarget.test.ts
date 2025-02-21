import { describe, it, expect, vi } from "vitest";
import { DataEventTarget } from "../src/DataEventTarget";

describe("DataEventTarget", () => {
  it("should return a stable promise from getAsync", async () => {
    const state = new DataEventTarget<string>();

    const p1 = state.getAsync();
    const p2 = state.getAsync();
    // Same promise, no value yet.
    expect(p1).toBe(p2);

    // Same value
    state.set("hello");
    const p3 = state.getAsync();
    const p4 = state.getAsync();
    expect(p3).toBe(p4);
    state.set("hello");
    const p5 = state.getAsync();
    expect(p3).toBe(p5);

    // Different value
    state.set("world");
    const p6 = state.getAsync();
    expect(p3).not.toBe(p6);
  });

  it("should resolve getAsync() when value is set", async () => {
    const state = new DataEventTarget<number>();

    const promise = state.getAsync();
    state.set(42);

    await expect(promise).resolves.toBe(42);
  });

  it("should return a value synchronously after it is set", () => {
    const state = new DataEventTarget<number>();

    state.set(10);
    expect(state.read()).toBe(10);
    expect(state.peek()).toBe(10);
  });

  it("should emit 'state:update' when value is set", () => {
    const state = new DataEventTarget<string>();
    const callback = vi.fn();

    state.addEventListener("state:update", callback);
    state.set("event-driven");

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { value: "event-driven" } }),
    );
  });

  it("should clear value on clear() and resolve a new promise", async () => {
    const state = new DataEventTarget<number>();
    state.set(100);
    expect(state.read()).toBe(100);

    state.clear();
    expect(state.peek()).toBe(undefined);

    const promise = state.getAsync();
    expect(promise).not.toBeUndefined();

    state.set(200);
    await expect(promise).resolves.toBe(200);
  });

  it("should remove pending resolvers on destroy", async () => {
    const state = new DataEventTarget<number>();

    const promise = state.getAsync();
    state.destroy();

    // Should NOT resolve since it's destroyed
    state.set(500);
    await expect(
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(reject, 50)),
      ]),
    ).rejects.toBeUndefined();
  });
});
