import { Broadcast, BroadcastMessageType } from "./Broadcast";

export class WindowBroadcast extends Broadcast<BroadcastMessageType> {
  constructor(
    private receiver: Window,
    private sender:
      | Window
      | Window[]
      | ((message: BroadcastMessageType) => Window[]),
  ) {
    super();
  }

  onMessage(handler: (event: MessageEvent<BroadcastMessageType>) => void) {
    this.receiver.addEventListener("message", handler, { signal: this.signal });
  }

  postMessage(
    message: BroadcastMessageType,
    { targetOrigin = "*", transfer }: WindowPostMessageOptions = {},
  ) {
    const senders =
      typeof this.sender === "function"
        ? this.sender(message)
        : Array.isArray(this.sender)
          ? this.sender
          : [this.sender];
    for (const sender of senders) {
      sender.postMessage(message, targetOrigin, transfer);
    }
  }
}
