/**
 * ÚNICA fonte de verdade dos limites de temperatura do Infracow.
 * Qualquer tela, relatório ou serviço que precise classificar uma temperatura
 * deve usar as funções daqui, nunca comparar com números soltos.
 *
 *   temp <= 34          -> "low"    (hipotermia)
 *   34 < temp < 38.7    -> "normal"
 *   temp >= 38.7        -> "high"   (hipertermia / febre)
 *
 * Faixa visual extra (só para cor dos ícones, continua sendo "normal"):
 *   38 < temp < 38.7    -> "attention" (laranja)
 */

export const TEMP_LOW_MAX = 34; // <= 34  -> hipotermia
export const TEMP_ATTENTION_MIN = 38; // > 38 e < 38.7 -> atenção (visual)
export const TEMP_HIGH_MIN = 38.7; // >= 38.7 -> febre

export type TempLevel = "low" | "normal" | "high";
export type TempBand = "low" | "normal" | "attention" | "high";

/** Classificação oficial (3 níveis): decide alerta, notificação e status. */
export function getTempLevel(temp: number): TempLevel {
  if (temp <= TEMP_LOW_MAX) return "low";
  if (temp >= TEMP_HIGH_MIN) return "high";
  return "normal";
}

/** Mesma regra, mas com a faixa laranja de atenção (usada nas cores dos ícones). */
export function getTempBand(temp: number): TempBand {
  const level = getTempLevel(temp);
  if (level !== "normal") return level;
  if (temp > TEMP_ATTENTION_MIN) return "attention";
  return "normal";
}

/** true quando a temperatura gera alerta (hipotermia ou febre). */
export function isTempAlert(temp: number): boolean {
  return getTempLevel(temp) !== "normal";
}
