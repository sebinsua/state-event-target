import { BroadcastTarget } from "./BroadcastTarget";

export class WindowBroadcastTarget extends BroadcastTarget {
  constructor(private target: Window) {
    super();
  }

  sendMessage(type: string, namespace: string, detail: any) {
    this.target.postMessage({ type, namespace, detail }, "*");
  }
}
