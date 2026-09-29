import type { SensorMockStatus } from "./types.js";

const CONTAINER_STYLE: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  left: "8px",
  bottom: "8px",
  zIndex: "2147483647",
  padding: "6px 8px",
  borderRadius: "6px",
  background: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  font: "11px monospace",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  pointerEvents: "auto",
};

const BUTTON_STYLE: Partial<CSSStyleDeclaration> = {
  cursor: "pointer",
  border: "1px solid black",
  borderRadius: "2px",
  background: "black",
  color: "inherit",
  font: "inherit",
  padding: "2px",
};

function applyStyle(el: HTMLElement, style: Partial<CSSStyleDeclaration>) {
  Object.assign(el.style, style);
}

export type Overlay = {
  update: (status: SensorMockStatus) => void;
  destroy: () => void;
};

/** Minimal, dependency-free bottom-left status/toggle widget. */
export function createOverlay(onToggle: () => void): Overlay {
  const container = document.createElement("div");
  applyStyle(container, CONTAINER_STYLE);
  container.setAttribute("data-sensor-mock-overlay", "");

  const label = document.createElement("span");
  const button = document.createElement("button");
  applyStyle(button, BUTTON_STYLE);
  button.type = "button";
  button.addEventListener("click", onToggle);

  container.append(button, label);
  document.body.appendChild(container);

  return {
    update(status) {
      const conn = status.connection;
      const pos = status.position
        ? `${status.position.latitude.toFixed(5)}, ${status.position.longitude.toFixed(5)}`
        : "no fix";
      label.textContent = `${conn} · ${pos}`;
      button.textContent = status.enabled ? "🟢" : "🔴";
    },
    destroy() {
      container.remove();
    },
  };
}
