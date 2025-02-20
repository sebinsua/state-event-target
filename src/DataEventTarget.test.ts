import { describe, it, expect, vi } from "vitest";
import { DataEventTarget } from "../src/DataEventTarget";

describe("DataEventTarget", () => {
  it("should return a stable promise from getAsync", async () => {
    const state = new DataEventTarget<string>();

    const p1 = state.getAsync();
    const p2 = state.getAsync();
    // Must return the same promise before resolution
    expect(p1).toBe(p2);

    state.set("hello");

    const value = await p1;
    expect(value).toBe("hello");

    const p3 = state.getAsync();
    // Must return the resolved promise
    expect(p3).toBe(p1);
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
