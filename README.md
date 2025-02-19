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

`state-event-target` is a state store with a primary source and synchronized replicas across frames, workers, and shared contexts. It uses `EventTarget` to emit updates and ensure reactive state consistency.

## TODO

#### data targets

- cache responses so subsequent reads are synchronous
- add robust error handling and race condition management for async state requests
- add a "prime" method to proactively fetch keys before read, returning a promise once loaded
- store version and last update `performance.now()` to avoid stale data

#### sink/source

- integrate automatic state:request in sink's read/peek/getAsync so missing keys trigger a fetch
- auto-generate unique IDs for sinks (and possibly the source) to allow for targeted messaging
- allow source configuration: either broadcast the full snapshot on connection or respond only to granular key requests
- let the source decide between global broadcasts or targeting specific sinks based on their IDs
- include versioning/sequence/timestamps in update events to coordinate state updates and avoid stale data

## Usage

### Source

```ts
import { KVDataEventTarget, source } from "state-event-target";

const stateSource = source(new KVDataEventTarget(), "demo", {
  eventsToBroadcast: ["state:update"],
});

stateSource.set("theme", "dark");
```

### Sink

```ts
import { KVDataEventTarget, sink } from "state-event-target";

const stateSink = sink(new KVDataEventTarget(), "demo", {
  "state:update": (target, { key, value }) => target.set(key, value),
  "state:reset": (target) => target.clear(),
});

// Initial read is asynchronous
console.log(await stateSink.read("123"));
// Subsequent reads are synchronous
console.log(stateSink.read("123"));

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
