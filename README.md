# `state-event-target`

> Primary state with event-driven replicas.

<div>
    <a href="https://www.npmjs.com/package/state-event-target">
      <img src="https://badgen.net/npm/v/state-event-target?" alt="NPM Version" />
    </a>
    <a href="https://github.com/sebinsua/state-event-target/actions/workflows/main.yml">
      <img src="https://github.com/sebinsua/state-event-target/workflows/CI/badge.svg" alt="Build Status" />
    </a>
</div>

## Introduction

`state-event-target` is a state store with a primary source and synchronized replicas across frames (and, if implemented by the developer, workers, and shared contexts). It uses `EventTarget` to emit updates and ensure reactive state consistency.

## Usage

### Unidirectional

#### Source

```ts
import { KVDataEventTarget, source, WindowBroadcast } from "state-event-target";

const childBroadcast = new WindowBroadcast(window, () =>
  Array.from(window.frames),
);
const stateSource = source(
  childBroadcast,
  new KVDataEventTarget<string, string>(),
  "demo",
);

stateSource.set("theme", "dark");
```

#### Sink

```ts
import { KVDataEventTarget, sink, WindowBroadcast } from "state-event-target";

const parentBroadcast = new WindowBroadcast(window, window.parent);
const stateSink = sink(
  parentBroadcast,
  new KVDataEventTarget<string, string>(),
  "demo",
);

// Initial read is asynchronous
console.log(await stateSink.read("theme"));
// Subsequent reads are synchronous
console.log(stateSink.read("theme"));

stateSink.addEventListener("state:update", (event) => {
  console.log("state:update:", event.detail);
});
```

### Bidirectional

#### Source

```ts
import { KVDataEventTarget, source, WindowBroadcast } from "state-event-target";

const writeChannel = new WindowBroadcast(window, () =>
  Array.from(window.frames),
);
const stateSource = source(
  writeChannel,
  new KVDataEventTarget<string, string>(),
  "demo",
);

writeChannel.onMessage((event) => {
  const { type, namespace, detail } = event.data;
  if (namespace !== "demo") {
    return;
  }

  if (type === "state:write") {
    stateSource.set(detail.param, detail.value);
  }
});
```

#### Sink

```ts
import { KVDataEventTarget, sink, WindowBroadcast } from "state-event-target";

const writeChannel = new WindowBroadcast(window, window.parent);
const stateSink = sink(
  writeChannel,
  new KVDataEventTarget<string, string>(),
  "demo",
);

writeChannel.postMessage({
  type: "state:write",
  namespace: "demo",
  detail: { param: "theme", value: "light" },
});

stateSink.addEventListener("state:update", (event) => {
  console.log("state:update:", event.detail);
});
```

## Installation

#### With `pnpm`

```sh
pnpm i state-event-target
```

#### With `npm`

```sh
npm i state-event-target
```

## Contribute

We welcome contributions! If you'd like to improve `state-event-target` or have any feedback, feel free to open an issue or submit a pull request.

## License

MIT
