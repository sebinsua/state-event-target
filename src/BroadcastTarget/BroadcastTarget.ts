export abstract class BroadcastTarget {
  protected controller = new AbortController();
  protected signal = this.controller.signal;

  abstract sendMessage(type: string, namespace: string, detail: any): void;

  detach() {
    this.controller.abort();
  }
}
