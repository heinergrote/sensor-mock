import { createSimClient, type SimClient } from "./client.js";
import { patchGeolocation } from "./geolocation.js";
import { createOverlay, type Overlay } from "./overlay.js";
import type {
  GeoPosition,
  SensorMockHandle,
  SensorMockOptions,
  SensorMockStatus,
} from "./types.js";

const IDLE_STATUS: SensorMockStatus = { enabled: false, connection: "idle", position: null };

export type {
  GeoPosition,
  SensorMockHandle,
  SensorMockOptions,
  SensorMockStatus,
  ConnectionStatus,
} from "./types.js";

/**
 * Module-level singleton: `navigator.geolocation` is a single global object,
 * so only one sensor-mock instance can be active at a time. Calling
 * `enableSensorMock` again fully tears down any previous instance first.
 */
let activeInstance: {
  options: SensorMockOptions;
  status: SensorMockStatus;
  listeners: Set<(status: SensorMockStatus) => void>;
  overlay: Overlay | null;
  client: SimClient | null;
  patch: ReturnType<typeof patchGeolocation> | null;
} | null = null;

function notify() {
  if (!activeInstance) return;
  const snapshot: SensorMockStatus = { ...activeInstance.status };
  for (const listener of activeInstance.listeners) listener(snapshot);
  activeInstance.overlay?.update(snapshot);
}

function readStoredUrl(key: string | undefined): string | undefined {
  if (!key) return undefined;
  try {
    return localStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

function writeStoredUrl(key: string | undefined, url: string) {
  if (!key) return;
  try {
    localStorage.setItem(key, url);
  } catch {
    // storage unavailable (private mode, blocked, SSR) – ignore
  }
}

/** Starts (or restarts) the WebSocket connection + geolocation patch. */
function start() {
  if (!activeInstance?.patch || activeInstance.client) return;
  const { options } = activeInstance;
  if (!options.url) return;

  const patch = activeInstance.patch;
  const client = createSimClient(options.url);
  client.subscribe((position: GeoPosition | null, connection) => {
    if (!activeInstance) return;
    activeInstance.status.position = position;
    activeInstance.status.connection = connection;
    patch.pushPosition(position);
    notify();
  });

  patch.setActive(true);
  activeInstance.client = client;
  activeInstance.status.enabled = true;
  activeInstance.status.connection = client.status;
  activeInstance.status.position = client.latestPosition;
  notify();
}

/** Stops the WebSocket connection and restores the real geolocation, keeping the overlay/listeners intact. */
function stop() {
  if (!activeInstance) return;
  activeInstance.client?.close();
  activeInstance.patch?.setActive(false);
  activeInstance.client = null;
  activeInstance.status.enabled = false;
  activeInstance.status.connection = "disconnected";
  notify();
}

/** Mounts or removes the overlay widget of the active instance. */
function setOverlayVisible(visible: boolean) {
  if (!activeInstance) return;
  if (!visible) {
    activeInstance.overlay?.destroy();
    activeInstance.overlay = null;
    return;
  }
  if (activeInstance.overlay) return;
  activeInstance.overlay = createOverlay(
    activeInstance.options.url ?? "",
    () => {
      if (activeInstance?.status.enabled) stop();
      else start();
    },
    (url) => {
      if (!activeInstance) return;
      writeStoredUrl(activeInstance.options.urlStorageKey, url);
      activeInstance.options = { ...activeInstance.options, url };
      stop();
      start();
    },
  );
  activeInstance.overlay.update({ ...activeInstance.status });
}

/**
 * Patches `navigator.geolocation` with live positions streamed from a
 * sensor-sim server simulation, so any code using the standard Geolocation
 * API receives mocked coordinates.
 */
export function enableSensorMock(options: SensorMockOptions = {}): SensorMockHandle {
  disableSensorMock();

  const url = readStoredUrl(options.urlStorageKey) ?? options.url;

  activeInstance = {
    options: { ...options, url },
    status: { enabled: false, connection: "idle", position: null },
    listeners: new Set(),
    overlay: null,
    client: null,
    patch: patchGeolocation(),
  };

  if (options.overlay ?? true) setOverlayVisible(true);

  start();
  notify();

  return {
    disable: disableSensorMock,
    setOverlayVisible,
    get status() {
      return activeInstance ? { ...activeInstance.status } : IDLE_STATUS;
    },
    subscribe(callback) {
      if (!activeInstance) return () => {};
      activeInstance.listeners.add(callback);
      return () => activeInstance?.listeners.delete(callback);
    },
  };
}

/** Fully tears down any active sensor-mock instance: connection, geolocation patch, and overlay. */
export function disableSensorMock(): void {
  if (!activeInstance) return;
  activeInstance.client?.close();
  activeInstance.patch?.restore();
  activeInstance.overlay?.destroy();
  activeInstance.listeners.clear();
  activeInstance = null;
}
