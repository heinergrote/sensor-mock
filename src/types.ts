export type GeoPosition = {
  latitude: number;
  longitude: number;
};

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type SensorMockStatus = {
  enabled: boolean;
  connection: ConnectionStatus;
  position: GeoPosition | null;
};

export type SensorMockOptions = {
  /** the url to stream the sensor updates from (includes a token for authentication)
   * Optional. If empty, mocking stays disabled until a url is applied (e.g. via the overlay). */
  url?: string
  /**
   * Optional localStorage key. If set, a url applied via the overlay is saved under this key,
   * and a saved non-empty url takes precedence over `url` on startup.
   */
  urlStorageKey?: string;
  /** Show the overlay. Defaults to `true`; can be toggled later via `handle.setOverlayVisible`. */
  overlay?: boolean;
};

export type SensorMockHandle = {
  disable: () => void;
  /** Shows or hides the overlay widget. */
  setOverlayVisible: (visible: boolean) => void;
  readonly status: SensorMockStatus;
  subscribe: (callback: (status: SensorMockStatus) => void) => () => void;
};
