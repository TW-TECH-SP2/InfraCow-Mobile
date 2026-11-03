
export const TEMP_LOW_MAX = 34;
export const TEMP_HIGH_MIN = 36;
export const TEMP_ATTENTION_MARGIN = 0.5;
export const TEMP_ATTENTION_MIN = TEMP_HIGH_MIN - TEMP_ATTENTION_MARGIN; // 35,5

export type TempLevel = "low" | "normal" | "high";
export type TempBand = "low" | "normal" | "attention" | "high";

export function getTempLevel(temp: number): TempLevel {
  if (temp <= TEMP_LOW_MAX) return "low";
  if (temp >= TEMP_HIGH_MIN) return "high";
  return "normal";
}

export function getTempBand(temp: number): TempBand {
  const level = getTempLevel(temp);
  if (level !== "normal") return level;
  if (temp >= TEMP_ATTENTION_MIN) return "attention";
  return "normal";
}

export function isTempAlert(temp: number): boolean {
  return getTempLevel(temp) !== "normal";
}

export function getAlertType(temp: number): "low" | "high" | null {
  const level = getTempLevel(temp);
  return level === "normal" ? null : level;
}