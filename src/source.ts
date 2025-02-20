import { WindowBroadcast } from "./Broadcast";

const DEFAULT_EVENTS_TO_BROADCAST = ["state:update", "state:reset"];

export function source<T extends EventTarget & { lastUpdated?: number }>(
  toBroadcastTarget: WindowBroadcast,
  fromSourceTarget: T,
  namespace: string,
  config: { id?: string; eventsToBroadcast?: string[] } = {},
): T {
  const eventsToBroadcast =
    config.eventsToBroadcast ?? DEFAULT_EVENTS_TO_BROADCAST;

  function handleEvent(event: Event) {
    const customEvent = event as CustomEvent<any>;
    if (!eventsToBroadcast.includes(customEvent.type)) {
      return;
    }

    const detail = customEvent.detail;
    if (detail) {
      if (config.id) {
        detail.id = config.id;
      }
      if (fromSourceTarget.lastUpdated) {
        detail.timestamp = fromSourceTarget.lastUpdated;
      }
    }

    toBroadcastTarget.sendMessage(customEvent.type, namespace, detail);
  }

  toBroadcastTarget.onMessage((event: MessageEvent) => {
    const { type, namespace: msgNamespace, detail } = event.data;
    if (msgNamespace !== namespace) {
      return;
    }
    if (type !== "state:request") {
      return;
    }

    fromSourceTarget.dispatchEvent(new CustomEvent("state:prime", { detail }));
  });
  for (const eventName of eventsToBroadcast) {
    fromSourceTarget.addEventListener(eventName, handleEvent);
  }

  return new Proxy(fromSourceTarget, {
    get(obj, prop) {
      const value = obj[prop as keyof T];

      if (prop === "detach") {
        return () => {
          toBroadcastTarget.detach();
          if (typeof value === "function") {
            value.apply(obj);
          }
        };
      }

      if (typeof value === "function") {
        return value.bind(obj);
      }

      return value;
    },
  }) as T;
}
