export abstract class BroadcastSource {
  protected controller = new AbortController();
  protected signal = this.controller.signal;

  abstract onMessage(handler: (event: MessageEvent<any>) => void): void;

  detach() {
    this.controller.abort();
  }
}
