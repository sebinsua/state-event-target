import { WindowBroadcast } from "./Broadcast";

type SinkEventTarget = EventTarget & {
  set: (...args: any[]) => void;
  clear: () => void;
  onMissing: (cb: EventListener) => void;
};

type SinkEventHandlers<T extends SinkEventTarget> = {
  [eventType: string]: (target: T, detail: any) => void;
};

export function sink<T extends SinkEventTarget>(
  fromBroadcastSource: WindowBroadcast,
  toSinkTarget: T,
  namespace: string,
  eventHandlers: SinkEventHandlers<T> = {
    "state:update": (target, detail) => {
      if ("param" in detail || "key" in detail) {
        target.set(detail.param ?? detail.key, detail.value);
      } else {
        target.set(detail.value);
      }
    },
    "state:reset": (target) => target.clear(),
  },
): T {
  function handleMessage(event: MessageEvent<any>) {
    const { type, namespace: msgNamespace, detail } = event.data;
    if (msgNamespace !== namespace) {
      return;
    }

    if (eventHandlers[type]) {
      eventHandlers[type](toSinkTarget, detail);
    } else {
      toSinkTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }
  }

  fromBroadcastSource.onMessage(handleMessage);
  toSinkTarget.onMissing((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      fromBroadcastSource.postMessage({
        type: "state:request",
        namespace,
        detail:
          "param" in detail
            ? { param: detail.param }
            : "key" in detail
              ? { key: detail.key }
              : {},
      });
    }
  });

  return new Proxy(toSinkTarget, {
    get(obj, prop) {
      const value = obj[prop as keyof T];

      if (prop === "destroy") {
        return () => {
          fromBroadcastSource.detach();
          if (typeof value === "function") {
            value.call(obj);
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
