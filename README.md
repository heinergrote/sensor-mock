# sensor-mock

Mock browser sensor APIs — starting with **Geolocation** — with live data
streamed from a running [sensor-sim](https://github.com/heinergrote/sensor-sim)
server simulation. It patches `navigator.geolocation` in place, so any code
using the standard Geolocation API (`getCurrentPosition`, `watchPosition`)
transparently receives mocked coordinates instead of the real device GPS.

## Install

```bash
npm install sensor-mock
# or
pnpm add sensor-mock
```

## Usage

```ts
import {enableSensorMock} from "sensor-mock";

const handle = enableSensorMock({
  url: "https://sensor-sim.h9e.de/s/<token>", // stream url (includes the auth token)
  urlStorageKey: "sensor-mock-url",           // optional: persist a url applied via the overlay
  overlay: true,                              // optional bottom-left status widget (default: true)
});

navigator.geolocation.watchPosition((position) => {
  console.log(position.coords.latitude, position.coords.longitude);
});

// later, to stop mocking and restore the real navigator.geolocation:
handle.disable();
```

Only one sensor-mock instance can be active at a time (`navigator.geolocation`
is a single global object). Calling `enableSensorMock` again automatically
tears down any previous instance first.

## Options

| Option          | Type      | Required | Description                                                                                                                                                                                                                                |
|-----------------|-----------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `url`           | `string`  | no       | URL to stream the sensor updates from (includes a token for authentication). `http(s)://` is converted to `ws(s)://` internally and `/ws` is appended. If omitted or empty, mocking stays disabled until a url is applied via the overlay. |
| `urlStorageKey` | `string`  | no       | localStorage key. If set, a url applied via the overlay is saved under this key, and on startup a saved non-empty url takes precedence over `url`.                                                                                         |
| `overlay`       | `boolean` | no       | Show a small bottom-left overlay with connection status, current coordinates, and an enable/disable toggle. Defaults to `true`; can be toggled later via `handle.setOverlayVisible`.                                                       |

All options are optional, so `enableSensorMock()` can be called without arguments.

## Handle API

`enableSensorMock` returns a handle:

- `disable()` — restores the real `navigator.geolocation` and closes the connection.
- `setOverlayVisible(visible)` — shows or hides the overlay widget.
- `status` — current `{ enabled, connection, position }` snapshot.
- `subscribe(callback)` — subscribe to status changes; returns an unsubscribe function.

## Overlay

When the overlay is enabled, a minimal, dependency-free widget is mounted in the
bottom-left corner showing mock state, connection status, and current
coordinates, with a button to toggle mocking on/off without losing the
connection or removing the widget. A text input shows the current `url`
(empty if none is set); enter a url and press **Apply** (or Enter) to enable
mocking and reconnect to the server with it. If `urlStorageKey` is set, the
applied url is saved to localStorage.

## Notes

- Zero runtime dependencies; ships as ESM + CJS with type declarations.
- Uses the native `WebSocket` API, so it works in any browser without a bundler.
