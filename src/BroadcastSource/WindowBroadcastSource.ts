import { BroadcastSource } from "./BroadcastSource";

export class WindowBroadcastSource extends BroadcastSource {
  constructor(private source: Window) {
    super();
  }

  onMessage(handler: (event: MessageEvent<any>) => void) {
    this.source.addEventListener("message", handler, { signal: this.signal });
  }
}
