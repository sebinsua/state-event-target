/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { source } from "./source/source";
import { sink } from "./sink/sink";
import { KVDataEventTarget } from "./KVDataEventTarget";

describe("source() and sink() integration", () => {
  it("should sync state updates from source to sink", async () => {
    const globalState = new KVDataEventTarget<string, string>();
    const replicatedState = new KVDataEventTarget<string, string>();

    const stateSource = source(globalState, "test-namespace", {
      eventsToBroadcast: ["state:update"],
    });

    const updateHandler = vi.fn();
    const stateSink = sink(replicatedState, "test-namespace", {
      "state:update": (target, detail) => {
        target.set(detail.key, detail.value);
      },
    });

    stateSink.addEventListener("state:update", updateHandler);

    // Set value in source
    stateSource.set("theme", "dark");

    // Simulate cross-context message delivery
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Sink should have received the update
    expect(stateSink.read("theme")).toBe("dark");
    expect(updateHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { key: "theme", value: "dark" } }),
    );
  });

  it("should allow sink to request state from source", async () => {
    const globalState = new KVDataEventTarget<string, string>();
    const replicatedState = new KVDataEventTarget<string, string>();

    const stateSource = source(globalState, "test-namespace", {
      eventsToBroadcast: ["state:update", "state:request"],
    });
    const stateSink = sink(replicatedState, "test-namespace", {
      "state:request": (target, detail) => {
        const value = globalState.read(detail.key);
        if (value !== undefined) {
          target.set(
            detail.key,
            // @ts-expect-error
            value,
          );
        }
      },
    });

    stateSource.set("theme", "light");

    // Sink requests state
    window.postMessage(
      {
        type: "state:request",
        namespace: "test-namespace",
        detail: { key: "theme" },
      },
      "*",
    );

    // Simulate message delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stateSink.read("theme")).toBe("light");
  });

  it("should handle state reset across source and sink", async () => {
    const globalState = new KVDataEventTarget<string, string>();
    const replicatedState = new KVDataEventTarget<string, string>();

    const stateSource = source(globalState, "test-namespace", {
      eventsToBroadcast: ["state:reset", "state:update"],
    });
    const stateSink = sink(replicatedState, "test-namespace", {
      "state:update": (target, detail) => {
        target.set(detail.key, detail.value);
      },
      "state:reset": (target) => target.clear(),
    });

    stateSource.set("theme", "dark");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(stateSink.read("theme")).toBe("dark");

    stateSource.clear();

    await new Promise((resolve) => setTimeout(resolve, 50));

    await expect(
      Promise.race([
        stateSink.read("theme"),
        new Promise((_, reject) => setTimeout(reject, 50)),
      ]),
    ).rejects.toBeUndefined();
  });
});
