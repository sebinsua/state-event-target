import { attachPromiseMeta, PromiseWithMeta } from "./PromiseWithMeta";

type PromiseResolver<Value> = (value: Value | PromiseLike<Value>) => void;

export class DataEventTarget<Value> extends EventTarget {
  #abortController = new AbortController();
  #promise?: PromiseWithMeta<Value>;
  #pendingResolvers: PromiseResolver<Value>[] = [];
  lastUpdated = performance.now();

  constructor(initialValue?: Value) {
    super();
    if (initialValue !== undefined) {
      this.set(initialValue);
    }

    this.addEventListener(
      "state:prime",
      (event) => {
        const value = this.peek();
        if (value !== undefined) {
          this.dispatchEvent(
            new CustomEvent("state:update", { detail: { value } }),
          );
        }
        this.prime();
      },
      { signal: this.#abortController.signal },
    );
  }

  /**
   * Read attempts to return the current value synchronously if one exists,
   * but otherwise returns a Promise that will resolve when a value is set.
   */
  read(): Value | PromiseWithMeta<Value> {
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
  peek(): Value | undefined {
    return this.#promise?.value;
  }

  /**
   * GetAsync will always return a *stable* Promise that resolves when a value is set.
   */
  getAsync(): PromiseWithMeta<Value> {
    if (!this.#promise) {
      this.#promise = attachPromiseMeta(
        new Promise((resolve) => {
          this.#pendingResolvers.push(resolve);
        }),
      );
      this.dispatchEvent(new CustomEvent("state:missing", { detail: {} }));
    }

    return this.#promise;
  }

  /**
   * Sets the value, resolving any pending Promises.
   */
  set(value: Value) {
    for (const pendingResolver of this.#pendingResolvers) {
      pendingResolver(value);
    }
    this.#pendingResolvers = [];

    const existing = this.#promise;
    if (!existing || existing.value !== value) {
      this.#promise = attachPromiseMeta(
        new Promise((resolve) => {
          this.#pendingResolvers.push(resolve);
        }),
      );
      this.#promise.status = "fulfilled";
      this.#promise.value = value;
    }

    this.dispatchEvent(new CustomEvent("state:update", { detail: { value } }));

    this.lastUpdated = performance.now();
  }

  onMissing(cb: EventListener) {
    this.addEventListener("state:missing", cb, {
      signal: this.#abortController.signal,
    });
  }

  clear() {
    this.#promise = undefined;
    this.#pendingResolvers = [];
    this.dispatchEvent(new CustomEvent("state:reset"));
  }

  destroy() {
    this.clear();
    this.#abortController.abort();
  }
}
