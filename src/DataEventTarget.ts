import { attachPromiseMeta, PromiseWithMeta } from "./PromiseWithMeta";

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

export class DataEventTarget<T> extends EventTarget {
  #promise?: PromiseWithMeta<T>;
  #pendingResolvers: PromiseResolver<T>[] = [];

  constructor(initialValue?: T) {
    super();
    if (initialValue !== undefined) {
      this.set(initialValue);
    }
  }

  read(): T | PromiseWithMeta<T> {
    const p = this.getAsync();
    return p.status === "fulfilled" ? p.value! : p;
  }

  peek(): T | undefined {
    return this.#promise?.value;
  }

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
