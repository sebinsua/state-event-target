export interface BroadcastMessageType {
  type: string;
  namespace: string;
  detail: unknown;
}

export abstract class Broadcast<MessageType extends BroadcastMessageType> {
  protected controller = new AbortController();
  protected signal = this.controller.signal;

  abstract onMessage(handler: (event: MessageEvent<MessageType>) => void): void;
  abstract postMessage(message: MessageType, options?: unknown): void;

  detach() {
    this.controller.abort();
  }
}
