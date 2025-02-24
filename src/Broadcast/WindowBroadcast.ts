import { Broadcast, BroadcastMessageType } from "./Broadcast";

export class WindowBroadcast<
  MessageType extends BroadcastMessageType,
> extends Broadcast<MessageType> {
  constructor(
    private receiver: Window,
    private sender: Window | Window[] | ((message: MessageType) => Window[]),
  ) {
    super();
  }

  onMessage(handler: (event: MessageEvent<MessageType>) => void) {
    this.receiver.addEventListener("message", handler, { signal: this.signal });
  }

  postMessage(
    message: MessageType,
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
