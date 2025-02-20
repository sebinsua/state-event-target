/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { source } from "./source";
import { sink } from "./sink";
import { KVDataEventTarget } from "./KVDataEventTarget";
import { WindowBroadcast } from "./Broadcast";
import { DataEventTarget } from "./DataEventTarget";

describe("source() and sink() integration", () => {
  it("should sync state updates from source to sink", async () => {
    const globalState = new KVDataEventTarget<string, string>();
    const replicatedState = new KVDataEventTarget<string, string>();

    const stateSource = source(
      new WindowBroadcast(window, window),
      globalState,
      "test-namespace-1",
    );

    const updateHandler = vi.fn();
    const stateSink = sink(
      new WindowBroadcast(window, window),
      replicatedState,
      "test-namespace-1",
    );

    stateSink.addEventListener("state:update", updateHandler);

    try {
      // Set value in source
      stateSource.set("theme", "dark");

      // Simulate cross-context message delivery
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Sink should have received the update
      expect(stateSink.read("theme")).toBe("dark");
      expect(updateHandler).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { key: "theme", value: "dark" } }),
      );
    } finally {
      stateSource.destroy();
      stateSink.destroy();
    }
  });

  it("should automatically request missing state from source", async () => {
    const sourceState = new KVDataEventTarget<string, string>();
    const sinkState = new KVDataEventTarget<string, string>();

    const stateSource = source(
      new WindowBroadcast(window, window),
      sourceState,
      "test-namespace-2",
    );
    const stateSink = sink(
      new WindowBroadcast(window, window),
      sinkState,
      "test-namespace-2",
    );

    try {
      // Set value in source
      sourceState.set("theme", "dark");

      // Sink requests missing value
      const value = await sinkState.getAsync("theme");

      expect(value).toBe("dark");
    } finally {
      stateSource.destroy();
      stateSink.destroy();
    }
  });

  it("should handle state reset across source and sink", async () => {
    const globalState = new KVDataEventTarget<string, string>();
    const replicatedState = new KVDataEventTarget<string, string>();

    const stateSource = source(
      new WindowBroadcast(window, window),
      globalState,
      "test-namespace-3",
    );
    const stateSink = sink(
      new WindowBroadcast(window, window),
      replicatedState,
      "test-namespace-3",
    );

    try {
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
    } finally {
      stateSource.destroy();
      stateSink.destroy();
    }
  });

  it("should support syncing behaviours using `DataEventTarget`", async () => {
    const sourceState = new DataEventTarget<string>();
    const sinkState = new DataEventTarget<string>();

    const stateSource = source(
      new WindowBroadcast(window, window),
      sourceState,
      "test-namespace-4",
    );
    const stateSink = sink(
      new WindowBroadcast(window, window),
      sinkState,
      "test-namespace-4",
    );

    try {
      sourceState.set("dark");

      const value = await sinkState.getAsync();
      expect(value).toBe("dark");

      sourceState.clear();
      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(
        Promise.race([
          stateSink.read(),
          new Promise((_, reject) => setTimeout(reject, 50)),
        ]),
      ).rejects.toBeUndefined();
    } finally {
      stateSource.destroy();
      stateSink.destroy();
    }
  });
});
