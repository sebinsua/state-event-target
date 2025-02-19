export function sink<T extends EventTarget & Record<string, any>>(
  target: T,
  namespace: string,
  eventHandlers: { [eventType: string]: (target: T, detail: any) => void },
): T {
  function handleMessage(event: MessageEvent<any>) {
    const { type, namespace: msgNamespace, detail } = event.data;
    if (msgNamespace !== namespace) return;

    if (eventHandlers[type]) {
      eventHandlers[type](target, detail);
    } else {
      target.dispatchEvent(new CustomEvent(type, { detail }));
    }
  }

  window.addEventListener("message", handleMessage);

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
