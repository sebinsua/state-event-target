import { attachPromiseMeta, PromiseWithMeta } from "./PromiseWithMeta";

function defaultGetKey<Param>(param: Param): Param {
  return param;
}

export interface KVEvents<Param, Value, Key = unknown> {
  "state:update": CustomEvent<{ param: Param; key: Key; value: Value }>;
  "state:reset": CustomEvent<void>;
}

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

interface KVDataEventTargetConfig<Param, Key = string> {
  getKey?: (param: Param) => Key;
}

export class KVDataEventTarget<
  Param,
  Value,
  Key = unknown,
> extends EventTarget {
  #config: Required<KVDataEventTargetConfig<Param, Key>>;
  #abortController = new AbortController();
  #promises: Map<Key, PromiseWithMeta<Value>> = new Map();
  #pendingResolvers: Map<Key, PromiseResolver<Value>[]> = new Map();

  lastUpdated = performance.now();

  constructor(
    initialEntries?: readonly (readonly [Param, Value])[] | null,
    config?: KVDataEventTargetConfig<Param, Key>,
  ) {
    super();

    this.#config = {
      getKey: defaultGetKey as (param: Param) => Key,
      ...config,
    };

    if (initialEntries) {
      for (const [param, value] of initialEntries) {
        const key = this.#config.getKey(param);
        const p = attachPromiseMeta(
          new Promise<Value>((resolve) => {
            this.#pendingResolvers.set(key, [
              ...(this.#pendingResolvers.get(key) ?? []),
              resolve,
            ]);
          }),
        );
        p.status = "fulfilled";
        p.value = value;
        this.#promises.set(key, p);
      }
    }

    this.addEventListener(
      "state:prime",
      (event) => {
        const detail = (event as CustomEvent).detail;
        const [key, param] =
          "param" in detail
            ? [this.#config.getKey(detail.param), detail.param]
            : [detail.key, detail.key as Param];
        const value = this.peek(param);
        if (value !== undefined) {
          this.dispatchEvent(
            new CustomEvent("state:update", { detail: { param, key, value } }),
          );
        }
        this.prime(key);
      },
      { signal: this.#abortController.signal },
    );
  }

  /**
   * Read attempts to return the current value synchronously if one exists,
   * but otherwise returns a Promise that will resolve when a value is set.
   */
  read(param: Param): Value | Promise<Value> {
    const p = this.getAsync(param);
    return p.status === "fulfilled" ? p.value! : p;
  }

  /**
   * Prime ensures there is a Promise ready to receive a future value.
   * Useful for setting up the Promise before you need the value.
   */
  prime(param: Param) {
    void this.getAsync(param);
  }

  /**
   * Peek will always synchronously read the value.
   * It will return undefined if no value has been set yet.
   */
  peek(param: Param): Value | undefined {
    const key = this.#config.getKey(param);
    return this.#promises.get(key)?.value;
  }

  /**
   * GetAsync will always return a *stable* Promise that resolves when a value is set.
   */
  getAsync(param: Param): PromiseWithMeta<Value> {
    const key = this.#config.getKey(param);
    if (!this.#promises.has(key)) {
      const p = attachPromiseMeta(
        new Promise<Value>((resolve) => {
          this.#pendingResolvers.set(key, [
            ...(this.#pendingResolvers.get(key) ?? []),
            resolve,
          ]);
        }),
      );
      this.#promises.set(key, p);
      this.dispatchEvent(
        new CustomEvent("state:missing", { detail: { param, key } }),
      );
    }

    return this.#promises.get(key)!;
  }

  /**
   * Sets the value, resolving any pending Promises.
   */
  set(param: Param, value: Value) {
    const key = this.#config.getKey(param);

    for (const pendingResolver of this.#pendingResolvers.get(key) ?? []) {
      pendingResolver(value);
    }
    this.#pendingResolvers.set(key, []);

    const existing = this.#promises.get(key);
    if (!existing || existing.value !== value) {
      const p = attachPromiseMeta(
        new Promise<Value>((resolve) => {
          this.#pendingResolvers.set(key, [
            ...(this.#pendingResolvers.get(key) ?? []),
            resolve,
          ]);
        }),
      );
      p.status = "fulfilled";
      p.value = value;
      this.#promises.set(key, p);
    }

    this.dispatchEvent(
      new CustomEvent("state:update", { detail: { param, key, value } }),
    );

    this.lastUpdated = performance.now();
  }

  onMissing(cb: EventListener) {
    this.addEventListener("state:missing", cb, {
      signal: this.#abortController.signal,
    });
  }

  clear() {
    this.#promises.clear();
    this.#pendingResolvers.clear();
    this.dispatchEvent(new CustomEvent("state:reset"));
  }

  destroy() {
    this.clear();
    this.#abortController.abort();
  }

  addEventListener<K extends keyof KVEvents<Param, Value, Key>>(
    type: K,
    listener: (ev: KVEvents<Param, Value, K>[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const opts =
      typeof options === "object" && options !== null
        ? options
        : { capture: options !== false };
    super.addEventListener(type, listener, opts);
  }

  removeEventListener<K extends keyof KVEvents<Param, Value, Key>>(
    type: K,
    listener: (ev: KVEvents<Param, Value, K>[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, listener, options);
  }
}
