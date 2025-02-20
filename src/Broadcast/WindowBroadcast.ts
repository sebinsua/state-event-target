import { Broadcast } from "./Broadcast";

export class WindowBroadcast extends Broadcast {
  constructor(
    private receiver: Window,
    private sender: Window | Window[],
  ) {
    super();
  }

  onMessage(handler: (event: MessageEvent<any>) => void) {
    this.receiver.addEventListener("message", handler, { signal: this.signal });
  }

  sendMessage(type: string, namespace: string, detail: any) {
    if (Array.isArray(this.sender)) {
      for (const sender of this.sender) {
        sender.postMessage({ type, namespace, detail }, "*");
      }
    } else {
      this.sender.postMessage({ type, namespace, detail }, "*");
    }
  }
}
