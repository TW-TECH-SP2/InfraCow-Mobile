import {
  Serialport,
  initSerialport,
  ReturnedDataType,
  DriverType,
  Mode,
} from "@serserm/react-native-turbo-serialport";
import {
  getTempLevel,
  TEMP_LOW_MAX,
  TEMP_ATTENTION_MIN,
  TEMP_HIGH_MIN,
} from "../utils/temperatureStatus";

export type MeasurementResult = {
  temperature: number;
  status: "success" | "warning";
  message: string;
};

type EspReading = { objeto_C: number; ambiente_C: number };
type EspResponse = { leituras: EspReading[] };

const BAUD_RATE = 115200;


const SIMULAR_MEDICAO = false;
const SIM_RANGES: [number, number][] = [
  [TEMP_LOW_MAX - 1, TEMP_LOW_MAX],                 // hipotermia 
  [TEMP_LOW_MAX + 0.1, TEMP_ATTENTION_MIN - 0.1],   // normal 
  [TEMP_ATTENTION_MIN, TEMP_HIGH_MIN - 0.1],        // quase febre 
  [TEMP_HIGH_MIN, TEMP_HIGH_MIN + 1],               // febre 
];

const BOOT_WAIT_MS = 2500;
const CONNECT_TIMEOUT_MS = 30000;

const MEASUREMENT_TIMEOUT_MS = 12000;
const RESEND_EVERY_MS = 4500;

const serialport = new Serialport();

let activeDeviceId = -1;
let activePortInterface = -1;
let connected = false;
let listenerStarted = false;

let lineBuffer = "";

type Waiter = {
  onConnected?: () => void;
  onLine?: (line: string) => void;
  onFatal: (msg: string) => void;
};
let waiter: Waiter | null = null;
let busy = false;

const trail: string[] = [];
let trailStart = Date.now();
let rxBytes = 0;

function logEvent(msg: string) {
  const line = `${Date.now() - trailStart}ms ${msg}`;
  trail.push(line);
  if (trail.length > 12) trail.shift();
  console.log("[USB]", line);
}

function trailText() {
  return trail.length ? ` [${trail.join(" | ")}]` : "";
}

initSerialport({
  autoConnect: false,
  mode: Mode.ASYNC,
  params: {
    driver: DriverType.AUTO,
    baudRate: BAUD_RATE,
    returnedDataType: ReturnedDataType.UTF8,
  },
});

function classifyTemperature(temp: number): Pick<MeasurementResult, "status" | "message"> {
  const level = getTempLevel(temp);
  if (level === "low") {
    return { status: "warning", message: "Temperatura abaixo do esperado." };
  }
  if (level === "high") {
    return { status: "warning", message: "Temperatura acima do esperado." };
  }
  return { status: "success", message: "Temperatura dentro do esperado." };
}

function resetConnectionState() {
  connected = false;
  activeDeviceId = -1;
  activePortInterface = -1;
  lineBuffer = "";
}

function hardDisconnect() {
  try { serialport.disconnect(activeDeviceId); } catch (_) {}
  resetConnectionState();
}

function ensureListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  serialport.startListening(({ type, deviceId, errorCode, errorMessage, data, portInterface }: any) => {
    if (type === "onReadData") {
      rxBytes += (data ?? "").length;
      console.log("[USB RX]", JSON.stringify((data ?? "").slice(0, 80)));
    } else {
      logEvent(`${type}${deviceId !== undefined ? ` id=${deviceId}` : ""}${errorCode ? ` err=${errorCode}` : ""}`);
    }

    switch (type) {
      case "onConnected": {
        activeDeviceId = deviceId ?? activeDeviceId;
        activePortInterface = typeof portInterface === "number" ? portInterface : -1;
        logEvent(`porta aberta if=${activePortInterface}`);
        connected = true;
        waiter?.onConnected?.();
        break;
      }

      case "onReadData": {
        lineBuffer += data ?? "";
        let idx: number;
        while ((idx = lineBuffer.indexOf("\n")) >= 0) {
          const line = lineBuffer.slice(0, idx).trim();
          lineBuffer = lineBuffer.slice(idx + 1);
          if (line) waiter?.onLine?.(line);
        }
        break;
      }

      case "onDisconnected":
      case "onDeviceDetached": {
        resetConnectionState();
        waiter?.onFatal("Dispositivo USB desconectado. Reconecte o circuito.");
        break;
      }

      case "onError": {
        hardDisconnect();
        waiter?.onFatal(`Erro USB (${errorCode}): ${errorMessage ?? "desconhecido"}`);
        break;
      }
    }
  });
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function ensureConnected(): Promise<void> {
  const devices = await serialport.listDevices();
  console.log("[USB devices]", JSON.stringify(devices));

  if (!devices || devices.length === 0) {
    resetConnectionState();
    throw new Error("Nenhum dispositivo USB encontrado.");
  }

  const espVendorIds = [12346, 4292, 6790];
  const espDevice =
    devices.find((d: any) => {
      const vid = Number(d?.vendorId ?? d?.vendor_id ?? -1);
      return espVendorIds.includes(vid);
    }) ?? devices[0];

  const dev: any = espDevice;
  const deviceId: number = dev?.deviceId ?? dev?.id ?? -1;

  if (deviceId === -1) {
    resetConnectionState();
    throw new Error("Dispositivo USB sem deviceId válido.");
  }

  logEvent(`dispositivo escolhido id=${deviceId} vid=${dev?.vendorId ?? "?"}`);

  if (connected && activeDeviceId === deviceId) {
    const stillOpen = await serialport.isConnected(deviceId).catch(() => false);
    if (stillOpen) return;
  }

  if (activeDeviceId !== -1 && activeDeviceId !== deviceId) {
    try { serialport.disconnect(activeDeviceId); } catch (_) {}
  }
  resetConnectionState();
  activeDeviceId = deviceId;

  serialport.setParams(
    { driver: DriverType.AUTO, baudRate: BAUD_RATE, returnedDataType: ReturnedDataType.UTF8 },
    deviceId,
  );

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      waiter = null;
      reject(new Error("Não foi possível conectar ao dispositivo USB (permissão não concedida?)."));
    }, CONNECT_TIMEOUT_MS);

    waiter = {
      onConnected: () => {
        clearTimeout(timer);
        waiter = null;
        resolve();
      },
      onFatal: (msg) => {
        clearTimeout(timer);
        waiter = null;
        reject(new Error(msg));
      },
    };

    serialport.connect(deviceId);
  });

  await sleep(BOOT_WAIT_MS);

  if (!connected || activeDeviceId === -1) {
    throw new Error("DESCONECTOU_NA_ESPERA");
  }

  lineBuffer = "";
}

function writeMedirCommand(): void {
  try {
    serialport.writeString("MEDIR\n", activeDeviceId, activePortInterface);
    logEvent(`MEDIR enviado id=${activeDeviceId} if=${activePortInterface}`);
  } catch (e: any) {
    logEvent(`writeString EXCEPTION: ${e?.message ?? e}`);
    throw new Error(`Falha ao enviar o comando: ${e?.message ?? e}`);
  }
}

function requestMeasurement(): Promise<MeasurementResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let resend: ReturnType<typeof setInterval> | undefined;

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (resend) clearInterval(resend);
      waiter = null;
      fn();
    };

    const timer = setTimeout(() => {
      done(() => {
        hardDisconnect();
        reject(new Error(`Timeout: o dispositivo não respondeu a tempo. (recebido: ${rxBytes} bytes)${trailText()}`));
      });
    }, MEASUREMENT_TIMEOUT_MS);

    waiter = {
      onLine: (line) => {
        if (line.startsWith("ERRO")) {
          done(() => reject(new Error("Sensor de temperatura indisponível. Verifique a ligação do circuito.")));
          return;
        }
        if (!line.startsWith("{")) return;

        try {
          const parsed: EspResponse = JSON.parse(line);
          const leituras = parsed?.leituras;
          if (!Array.isArray(leituras) || leituras.length === 0) {
            done(() => reject(new Error("Resposta inválida: array de leituras vazio.")));
            return;
          }
          const valores = leituras.map((l: any) => Number(l?.objeto_C)).filter((v: number) => Number.isFinite(v));
          if (valores.length === 0) {
            done(() => reject(new Error("Leitura inválida do sensor.")));
            return;
          }
          const media = valores.reduce((a: number, b: number) => a + b, 0) / valores.length;
          const temperature = Number(media.toFixed(1));
          if (!Number.isFinite(temperature)) {
            done(() => reject(new Error("Leitura inválida do sensor.")));
            return;
          }
          done(() => resolve({ temperature, ...classifyTemperature(temperature) }));
        } catch (_) {
          done(() => reject(new Error("Falha ao interpretar resposta do sensor.")));
        }
      },
      onFatal: (msg) => done(() => reject(new Error(msg))),
    };

    lineBuffer = "";
    logEvent(`envia MEDIR id=${activeDeviceId} connected=${connected}`);
    try {
      writeMedirCommand();
    } catch (e: any) {
      done(() => reject(new Error(e?.message ?? String(e))));
      return;
    }

    resend = setInterval(() => {
      if (settled) return;
      try {
        logEvent("reenvia MEDIR");
        writeMedirCommand();
      } catch (_) {}
    }, RESEND_EVERY_MS);
  });
}

async function simulateMeasurement(): Promise<MeasurementResult> {
  await sleep(1500);
  const [min, max] = SIM_RANGES[Math.floor(Math.random() * SIM_RANGES.length)];
  const temperature = Number((min + Math.random() * (max - min)).toFixed(1));
  return { temperature, ...classifyTemperature(temperature) };
}

export async function startUsbMeasurement(): Promise<MeasurementResult> {
  if (SIMULAR_MEDICAO) return simulateMeasurement();
  if (busy) throw new Error("Já existe uma medição em andamento.");
  busy = true;
  try {
    ensureListener();
    trail.length = 0;
    trailStart = Date.now();
    rxBytes = 0;

    try {
      await ensureConnected();
    } catch (e: any) {
      if (e?.message !== "DESCONECTOU_NA_ESPERA") throw e;

      logEvent("reconectando");
      await sleep(1500);
      try {
        await ensureConnected();
      } catch (e2: any) {
        if (e2?.message === "DESCONECTOU_NA_ESPERA") {
          throw new Error(`A placa desconecta do USB logo após conectar (reinicia ao abrir a porta).${trailText()}`);
        }
        throw e2;
      }
    }

    return await requestMeasurement();
  } finally {
    busy = false;
    waiter = null;
  }
}

export default {
  startUsbMeasurement,
};