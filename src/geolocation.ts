import type { Position } from "./types.js";

type WatchEntry = {
  success: PositionCallback;
  error?: PositionErrorCallback | null;
  options?: PositionOptions;
  /** Id of the underlying real watch, while the facade is inactive. */
  realId: number | null;
};

const POSITION_UNAVAILABLE = 2;

function buildPosition(position: Position): GeolocationPosition {
  const coords: GeolocationCoordinates = {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON() {
      return { ...this };
    },
  };
  return {
    coords,
    timestamp: Date.now(),
    toJSON() {
      return { coords: coords.toJSON(), timestamp: this.timestamp };
    },
  };
}

function buildPositionUnavailableError(): GeolocationPositionError {
  return {
    code: POSITION_UNAVAILABLE,
    message: "sensor-mock: no position received yet",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

/**
 * Replaces `navigator.geolocation` with a facade that either serves positions
 * supplied via `pushPosition` (active) or delegates to the real geolocation
 * (inactive). Watchers registered through the facade survive `setActive`
 * toggles: they are moved between the mock and the real implementation, so
 * consumers (e.g. a map) follow the toggle without re-registering.
 */
export function patchGeolocation() {
  const original = navigator.geolocation;
  let active = false;
  let current: Position | null = null;
  const watchers = new Map<number, WatchEntry>();
  let nextWatchId = 1;

  const watchReal = (entry: WatchEntry) => {
    entry.realId = original.watchPosition(entry.success, entry.error, entry.options);
  };
  const unwatchReal = (entry: WatchEntry) => {
    if (entry.realId !== null) original.clearWatch(entry.realId);
    entry.realId = null;
  };

  const mock: Geolocation = {
    getCurrentPosition(success, error, options) {
      if (!active) return original.getCurrentPosition(success, error, options);
      if (current) success(buildPosition(current));
      else error?.(buildPositionUnavailableError());
    },
    watchPosition(success, error, options) {
      const id = nextWatchId++;
      const entry: WatchEntry = { success, error, options, realId: null };
      watchers.set(id, entry);
      if (!active) watchReal(entry);
      else if (current) success(buildPosition(current));
      return id;
    },
    clearWatch(id) {
      const entry = watchers.get(id);
      if (entry) unwatchReal(entry);
      watchers.delete(id);
    },
  };

  Object.defineProperty(navigator, "geolocation", {
    value: mock,
    configurable: true,
  });

  return {
    /** Switch between mocked (true) and real (false) positions, moving existing watchers over. */
    setActive(next: boolean) {
      if (next === active) return;
      active = next;
      current = null;
      for (const entry of watchers.values()) {
        if (active) unwatchReal(entry);
        else watchReal(entry);
      }
    },
    /** Feed a freshly received position to all active watchers (while active). */
    pushPosition(position: Position | null) {
      if (!active) return;
      current = position;
      if (!position) return;
      const built = buildPosition(position);
      for (const { success } of watchers.values()) success(built);
    },
    /** Hands watchers back to the real geolocation and restores `navigator.geolocation`. */
    restore() {
      this.setActive(false);
      Object.defineProperty(navigator, "geolocation", {
        value: original,
        configurable: true,
      });
    },
  };
}
