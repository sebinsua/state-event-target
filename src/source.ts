import { BroadcastTarget } from "./BroadcastTarget/BroadcastTarget";

export function source<T extends EventTarget>(
  toBroadcastTarget: BroadcastTarget,
  fromSourceTarget: T,
  namespace: string,
  config: { eventsToBroadcast: string[] },
): T {
  function handleEvent(event: Event) {
    const customEvent = event as CustomEvent<any>;
    if (!config.eventsToBroadcast.includes(customEvent.type)) {
      return;
    }

    toBroadcastTarget.sendMessage(
      customEvent.type,
      namespace,
      customEvent.detail,
    );
  }

  for (const eventName of config.eventsToBroadcast) {
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
