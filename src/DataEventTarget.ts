import { attachPromiseMeta, PromiseWithMeta } from "./PromiseWithMeta";

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

export class DataEventTarget<T> extends EventTarget {
  #promise?: PromiseWithMeta<T>;
  #pendingResolvers: PromiseResolver<T>[] = [];
  lastUpdated = performance.now();

  constructor(initialValue?: T) {
    super();
    if (initialValue !== undefined) {
      this.set(initialValue);
    }
  }

  /**
   * Read attempts to return the current value synchronously if one exists,
   * but otherwise returns a Promise that will resolve when a value is set.
   */
  read(): T | PromiseWithMeta<T> {
    const p = this.getAsync();
    return p.status === "fulfilled" ? p.value! : p;
  }

  /**
   * Prime ensures there is a Promise ready to receive a future value.
   * Useful for setting up the Promise before you need the value.
   */
  prime() {
    void this.getAsync();
  }

  /**
   * Peek will always synchronously read the value.
   * It will return undefined if no value has been set yet.
   */
  peek(): T | undefined {
    return this.#promise?.value;
  }

  /**
   * GetAsync will always return a *stable* Promise that resolves when a value is set.
   */
  getAsync(): PromiseWithMeta<T> {
    if (!this.#promise) {
      this.#promise = attachPromiseMeta(
        new Promise((resolve) => {
          this.#pendingResolvers.push(resolve);
        }),
      );
    }

    return this.#promise;
  }

  /**
   * Sets the value, resolving any pending Promises.
   */
  set(value: T) {
    for (const pendingResolver of this.#pendingResolvers) {
      pendingResolver(value);
    }
    this.#pendingResolvers = [];

    if (!this.#promise) {
      this.#promise = attachPromiseMeta(
        new Promise((resolve) => {
          this.#pendingResolvers.push(resolve);
        }),
      );
      this.#promise.status = "fulfilled";
      this.#promise.value = value;
    }

    this.dispatchEvent(new CustomEvent("state:update", { detail: value }));

    this.lastUpdated = performance.now();
  }

  clear() {
    this.#promise = undefined;
    this.#pendingResolvers = [];
    this.dispatchEvent(new CustomEvent("state:reset"));
  }

  destroy() {
    this.clear();
  }
}
