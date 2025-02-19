export function source<T extends EventTarget & Record<string, any>>(
  target: T,
  namespace: string,
  config: { eventsToBroadcast: string[] },
): T {
  function handleEvent(event: Event) {
    const customEvent = event as CustomEvent<any>;
    if (!config.eventsToBroadcast.includes(customEvent.type)) return;

    window.postMessage(
      { type: customEvent.type, namespace, detail: customEvent.detail },
      "*",
    );
  }

  config.eventsToBroadcast.forEach((event) => {
    target.addEventListener(event, handleEvent);
  });

  return new Proxy(target, {
    get(obj, prop) {
      const value = obj[prop as keyof T];
      if (typeof value === "function") {
        // Bind native methods to the original target so that any internal slots are preserved.
        return value.bind(obj);
      }
      return value;
    },
  });
}
