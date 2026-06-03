type MeasurementTarget = {
  id?: number | string | null;
  nome_animal?: string | null;
  nome?: string | null;
  genero?: string | null;
};

export type MeasurementResult = {
  temperature: number;
  status: "success" | "warning";
  message: string;
};

const normalizeText = (value?: string | null) => String(value ?? "").trim().toLowerCase();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const seedFromTarget = (target?: MeasurementTarget | null) => {
  const key = `${target?.id ?? ""}-${target?.nome_animal ?? target?.nome ?? ""}-${target?.genero ?? ""}`;
  let seed = 0;
  for (let index = 0; index < key.length; index += 1) {
    seed = (seed + key.charCodeAt(index) * (index + 1)) % 9973;
  }
  return seed;
};

export async function startMockMeasurement(target?: MeasurementTarget | null): Promise<MeasurementResult> {
  const seed = seedFromTarget(target);
  const genre = normalizeText(target?.genero);
  const baseTemperature = genre.includes("mach") || genre === "m" ? 38.6 : 38.2;
  const variation = (seed % 9) / 10;
  const isWarning = seed % 4 === 0;

  await wait(3500);

  const temperature = Number((baseTemperature + variation + (isWarning ? 1.3 : 0)).toFixed(1));

  return {
    temperature,
    status: isWarning ? "warning" : "success",
    message: isWarning
      ? "Temperatura acima do esperado."
      : "Temperatura dentro do esperado.",
  };
}

export default {
  startMockMeasurement,
};