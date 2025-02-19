import { attachPromiseMeta, PromiseWithMeta } from "./PromiseWithMeta";

export interface KVEvents<K, V> {
  "state:update": CustomEvent<{ key: K; value: V }>;
  "state:reset": CustomEvent<void>;
}

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

export class KVDataEventTarget<K, V> extends EventTarget {
  #promises: Map<K, PromiseWithMeta<V>> = new Map();
  #pendingResolvers: Map<K, PromiseResolver<V>[]> = new Map();

  /**
   * Read attempts to return the current value synchronously if one exists,
   * but otherwise returns a Promise that will resolve when a value is set.
   */
  read(key: K): V | Promise<V> {
    const p = this.getAsync(key);
    return p.status === "fulfilled" ? p.value! : p;
  }

  /**
   * Prime ensures there is a Promise ready to receive a future value.
   * Useful for setting up the Promise before you need the value.
   */
  prime(key: K) {
    void this.getAsync(key);
  }

  /**
   * Peek will always synchronously read the value.
   * It will return undefined if no value has been set yet.
   */
  peek(key: K): V | undefined {
    return this.#promises.get(key)?.value;
  }

  /**
   * GetAsync will always return a *stable* Promise that resolves when a value is set.
   */
  getAsync(key: K): PromiseWithMeta<V> {
    if (!this.#promises.has(key)) {
      const p = attachPromiseMeta(
        new Promise<V>((resolve) => {
          this.#pendingResolvers.set(key, [
            ...(this.#pendingResolvers.get(key) ?? []),
            resolve,
          ]);
        }),
      );
      this.#promises.set(key, p);
    }

    return this.#promises.get(key)!;
  }

  /**
   * Sets the value, resolving any pending Promises.
   */
  set(key: K, value: V) {
    for (const pendingResolver of this.#pendingResolvers.get(key) ?? []) {
      pendingResolver(value);
    }
    this.#pendingResolvers.set(key, []);

    if (!this.#promises.has(key)) {
      const p = attachPromiseMeta(
        new Promise<V>((resolve) => {
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
      new CustomEvent("state:update", { detail: { key, value } }),
    );
  }

  clear() {
    this.#promises.clear();
    this.#pendingResolvers.clear();
    this.dispatchEvent(new CustomEvent("state:reset"));
  }

  destroy() {
    this.clear();
  }

  addEventListener<K extends keyof KVEvents<K, V>>(
    type: K,
    listener: (ev: KVEvents<K, V>[K]) => void,
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

  removeEventListener<K extends keyof KVEvents<K, V>>(
    type: K,
    listener: (ev: KVEvents<K, V>[K]) => void,
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
