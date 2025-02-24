/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { source } from "./source";
import { sink } from "./sink";
import { KVDataEventTarget } from "./KVDataEventTarget";
import { WindowBroadcast } from "./Broadcast";
import { DataEventTarget } from "./DataEventTarget";

import { SwrCache } from "swr-cache-event-target";

describe("source() and sink() integration", () => {
  it("should sync state updates from source to sink", async () => {
    const sourceState = source(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<string, string>(),
      "test-namespace-1",
    );

    const updateHandler = vi.fn();
    const sinkState = sink(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<string, string>(),
      "test-namespace-1",
    );

    sinkState.addEventListener("state:update", updateHandler);

    try {
      sourceState.set("theme", "dark");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sinkState.read("theme")).toBe("dark");
      expect(updateHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { param: "theme", key: "theme", value: "dark" },
        }),
      );
    } finally {
      sourceState.destroy();
      sinkState.destroy();
    }
  });

  it("should automatically request missing state from source", async () => {
    const sourceState = source(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<string, string>(),
      "test-namespace-2",
    );
    const sinkState = sink(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<string, string>(),
      "test-namespace-2",
    );

    try {
      sourceState.set("theme", "dark");

      const value = await sinkState.getAsync("theme");

      expect(value).toBe("dark");
    } finally {
      sourceState.destroy();
      sinkState.destroy();
    }
  });

  it("should handle state reset across source and sink", async () => {
    const sourceState = source(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<string, string>(),
      "test-namespace-3",
    );
    const sinkState = sink(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<string, string>(),
      "test-namespace-3",
    );

    try {
      sourceState.set("theme", "dark");

      await new Promise((resolve) => setTimeout(resolve, 50));

      sourceState.clear();

      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(
        Promise.race([
          sinkState.read("theme"),
          new Promise((_, reject) => setTimeout(reject, 50)),
        ]),
      ).rejects.toBeUndefined();
    } finally {
      sourceState.destroy();
      sinkState.destroy();
    }
  });

  it("should support syncing behaviours using `DataEventTarget`", async () => {
    const sourceState = source(
      new WindowBroadcast(window, window),
      new DataEventTarget<string>(),
      "test-namespace-4",
    );
    const sinkState = sink(
      new WindowBroadcast(window, window),
      new DataEventTarget<string>(),
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
          sinkState.read(),
          new Promise((_, reject) => setTimeout(reject, 50)),
        ]),
      ).rejects.toBeUndefined();
    } finally {
      sourceState.destroy();
      sinkState.destroy();
    }
  });

  it("should sync SWR cache refreshes across contexts", async () => {
    type CacheParam = { type: string; id: string };
    type CacheValue = { value: string; timestamp: number };

    const getKey = (param: CacheParam) => `${param.type}:${param.id}`;

    const sourceSwcCache = source(
      new WindowBroadcast(window, window),
      new SwrCache<CacheParam, CacheValue>({
        getValue: async (param) => ({
          value: `value-${param.type}-${param.id}`,
          timestamp: Date.now(),
        }),
        getKey,
        ttlMs: 50,
        refreshIntervalMs: 100,
      }),
      "cache-namespace",
    );

    const sinkStore = sink(
      new WindowBroadcast(window, window),
      new KVDataEventTarget<CacheParam, CacheValue>([], {
        getKey,
      }),
      "cache-namespace",
    );

    try {
      const testParam = { type: "user", id: "123" };

      // Initial fetch triggers source cache
      const initial = await sinkStore.getAsync(testParam);
      const initialTimestamp = initial.timestamp;

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have new timestamp from source refresh
      const updated = await sinkStore.getAsync(testParam);
      expect(updated.timestamp).toBeGreaterThan(initialTimestamp);
    } finally {
      sourceSwcCache.destroy();
      sinkStore.destroy();
    }
  });

  it("should support bidirectional communication between source and sink", async () => {
    type StateWriteMessageType = {
      type: "state:write";
      namespace: string;
      detail: { param: string; value: string };
    };

    const sourceChannel = new WindowBroadcast<StateWriteMessageType>(
      window,
      window,
    );
    const sourceState = source(
      sourceChannel,
      new KVDataEventTarget<string, string>(),
      "test-bidirectional",
    );

    const sinkChannel = new WindowBroadcast<StateWriteMessageType>(
      window,
      window,
    );
    const sinkState = sink(
      sinkChannel,
      new KVDataEventTarget<string, string>(),
      "test-bidirectional",
    );

    try {
      sourceChannel.onMessage((event) => {
        const { type, namespace, detail } = event.data;
        if (namespace !== "test-bidirectional") {
          return;
        }

        if (type === "state:write") {
          sourceState.set(detail.param, detail.value);
        }
      });

      sinkChannel.postMessage({
        type: "state:write",
        namespace: "test-bidirectional",
        detail: { param: "theme", value: "light" },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sourceState.peek("theme")).toBe("light");

      expect(sinkState.peek("theme")).toBe("light");

      sourceState.set("language", "en");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sinkState.peek("language")).toBe("en");
    } finally {
      sourceState.destroy();
      sinkState.destroy();
    }
  });
});
