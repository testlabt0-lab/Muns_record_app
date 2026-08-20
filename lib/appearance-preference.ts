export type AppearanceMode = "light" | "dark";

export function normalizeAppearanceMode(value: unknown): AppearanceMode {
  return value === "dark" ? "dark" : "light";
}
