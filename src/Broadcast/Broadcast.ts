export abstract class Broadcast {
  protected controller = new AbortController();
  protected signal = this.controller.signal;

  abstract onMessage(handler: (event: MessageEvent<any>) => void): void;
  abstract sendMessage(type: string, namespace: string, detail: any): void;

  detach() {
    this.controller.abort();
  }
}
