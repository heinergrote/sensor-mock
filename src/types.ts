export type Position = {
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
  position: Position | null;
};

export type SensorMockOptions = {
  serverUrl: string;
  /** Optional. If empty, mocking stays disabled until a token is applied (e.g. via the overlay). */
  shareToken?: string;
  overlay?: boolean;
};

export type SensorMockHandle = {
  disable: () => void;
  readonly status: SensorMockStatus;
  subscribe: (callback: (status: SensorMockStatus) => void) => () => void;
};
