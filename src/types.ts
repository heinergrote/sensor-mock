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
  shareToken: string;
  overlay?: boolean;
};

export type SensorMockHandle = {
  disable: () => void;
  readonly status: SensorMockStatus;
  subscribe: (callback: (status: SensorMockStatus) => void) => () => void;
};
