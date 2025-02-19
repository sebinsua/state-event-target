import { BroadcastSource } from "./BroadcastSource/BroadcastSource";

export function sink<T extends EventTarget>(
  fromBroadcastSource: BroadcastSource,
  toSinkTarget: T,
  namespace: string,
  eventHandlers: { [eventType: string]: (target: T, detail: any) => void },
): T {
  function handleMessage(event: MessageEvent<any>) {
    const { type, namespace: msgNamespace, detail } = event.data;
    if (msgNamespace !== namespace) return;

    if (eventHandlers[type]) {
      eventHandlers[type](toSinkTarget, detail);
    } else {
      toSinkTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }
  }

  fromBroadcastSource.onMessage(handleMessage);

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
