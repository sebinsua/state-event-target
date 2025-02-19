import { attachPromiseMeta, PromiseWithMeta } from "./PromiseWithMeta";

export interface KVEvents<K, V> {
  "state:update": CustomEvent<{ key: K; value: V }>;
  "state:reset": CustomEvent<void>;
}

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

export class KVDataEventTarget<K, V> extends EventTarget {
  #promises: Map<K, PromiseWithMeta<V>> = new Map();
  #pendingResolvers: Map<K, PromiseResolver<V>[]> = new Map();

  read(key: K): V | Promise<V> {
    const p = this.getAsync(key);
    return p.status === "fulfilled" ? p.value! : p;
  }

  peek(key: K): V | undefined {
    return this.#promises.get(key)?.value;
  }

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
