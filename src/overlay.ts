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

const INPUT_STYLE: Partial<CSSStyleDeclaration> = {
  font: "inherit",
  color: "#fff",
  background: "rgba(255, 255, 255, 0.15)",
  border: "1px solid black",
  borderRadius: "2px",
  padding: "2px 4px",
  width: "110px",
};

export type Overlay = {
  update: (status: SensorMockStatus) => void;
  destroy: () => void;
};

/** Minimal, dependency-free bottom-left status/toggle widget with a shareToken input. */
export function createOverlay(
  initialToken: string,
  onToggle: () => void,
  onApplyToken: (token: string) => void,
): Overlay {
  const container = document.createElement("div");
  applyStyle(container, CONTAINER_STYLE);
  container.setAttribute("data-sensor-mock-overlay", "");

  const label = document.createElement("span");
  const button = document.createElement("button");
  applyStyle(button, BUTTON_STYLE);
  button.type = "button";
  button.addEventListener("click", onToggle);

  const input = document.createElement("input");
  applyStyle(input, INPUT_STYLE);
  input.type = "text";
  input.placeholder = "shareToken";
  input.value = initialToken;
  input.spellcheck = false;
  input.autocomplete = "off";

  const apply = document.createElement("button");
  applyStyle(apply, BUTTON_STYLE);
  apply.type = "button";
  apply.textContent = "Apply";
  const submit = () => onApplyToken(input.value.trim());
  apply.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  container.append(button, label, input, apply);
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
