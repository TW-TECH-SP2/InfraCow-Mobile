import {
  Serialport,
  initSerialport,
  ReturnedDataType,
  DriverType,
  Mode,
} from "@serserm/react-native-turbo-serialport";
import { getTempLevel } from "../utils/temperatureStatus";

export type MeasurementResult = {
  temperature: number;
  status: "success" | "warning";
  message: string;
};

type EspReading = { objeto_C: number; ambiente_C: number };
type EspResponse = { leituras: EspReading[] };

const BAUD_RATE = 115200;


const BOOT_WAIT_MS = 2500;
const CONNECT_TIMEOUT_MS = 30000;
const MEASUREMENT_TIMEOUT_MS = 4000;

const serialport = new Serialport();

let activeDeviceId = -1;
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
  lineBuffer = "";
}

function hardDisconnect() {
  try { serialport.disconnect(activeDeviceId); } catch (_) {}
  resetConnectionState();
}


function ensureListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  serialport.startListening(({ type, deviceId, errorCode, errorMessage, data }) => {
    switch (type) {
      case "onConnected": {
        activeDeviceId = deviceId ?? activeDeviceId;
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
  if (!devices || devices.length === 0) {
    resetConnectionState();
    throw new Error("Nenhum dispositivo USB encontrado.");
  }

  const dev: any = devices[0];
  const deviceId: number = dev?.deviceId ?? dev?.id ?? -1;

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
  lineBuffer = "";
}

function requestMeasurement(): Promise<MeasurementResult> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      waiter = null;
      fn();
    };

    const timer = setTimeout(() => {
      done(() => {
        hardDisconnect();
        reject(new Error("Timeout: o dispositivo não respondeu a tempo."));
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
    serialport.writeString("MEDIR\n", activeDeviceId, 0);
  });
}

export async function startUsbMeasurement(): Promise<MeasurementResult> {
  if (busy) throw new Error("Já existe uma medição em andamento.");
  busy = true;
  try {
    ensureListener();
    await ensureConnected();
    return await requestMeasurement();
  } finally {
    busy = false;
    waiter = null;
  }
}

export default {
  startUsbMeasurement,
};