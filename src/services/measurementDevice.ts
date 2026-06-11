import {
  Serialport,
  initSerialport,
  ReturnedDataType,
  DriverType,
  Mode,
} from "@serserm/react-native-turbo-serialport";

export type MeasurementResult = {
  temperature: number;
  status: "success" | "warning";
  message: string;
};

type EspReading = {
  objeto_C: number;
  ambiente_C: number;
};

type EspResponse = {
  leituras: EspReading[];
};

const BAUD_RATE = 115200;
const MEASUREMENT_TIMEOUT_MS = 16000;

// Instância única — inicializada uma vez no módulo
const serialport = new Serialport();

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
  if (temp >= 39.5) {
    return { status: "warning", message: "Temperatura acima do esperado." };
  }
  return { status: "success", message: "Temperatura dentro do esperado." };
}

export async function startUsbMeasurement(): Promise<MeasurementResult> {
  // Garante que qualquer listener anterior foi removido ANTES de criar novo
  // Isso evita múltiplos listeners acumulados entre medições
  try { serialport.stopListening(); } catch (_) {}

  // Pequena pausa para o Android estabilizar
  await new Promise((res) => setTimeout(res, 300));

  return new Promise(async (resolve, reject) => {
    let receivedData = "";
    let settled = false;
    let connectedDeviceId = -1;
    let connectedPortInterface = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
      // Para de escutar ANTES de desconectar para não receber eventos de desconexão
      try { serialport.stopListening(); } catch (_) {}
      if (connectedDeviceId !== -1) {
        try { serialport.disconnect(connectedDeviceId); } catch (_) {}
      }
    };

    const finish = (result: MeasurementResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(msg));
    };

    timeoutHandle = setTimeout(() => {
      fail("Timeout: o dispositivo não respondeu a tempo.");
    }, MEASUREMENT_TIMEOUT_MS);

    // Registra o listener ANTES de conectar para não perder o onConnected
    serialport.startListening(({ type, deviceId, portInterface, errorCode, errorMessage, data }) => {
      if (settled) return; // ignora eventos após encerrado

      switch (type) {
        case "onConnected": {
          connectedDeviceId = deviceId ?? connectedDeviceId;
          connectedPortInterface = portInterface ?? 0;
          serialport.writeString("MEDIR\n", connectedDeviceId, connectedPortInterface);
          break;
        }

        case "onReadData": {
          receivedData += data ?? "";

          if (receivedData.includes("\n")) {
            const line = receivedData.split("\n")[0].trim();
            try {
              const parsed: EspResponse = JSON.parse(line);
              const leituras = parsed?.leituras;

              if (!Array.isArray(leituras) || leituras.length === 0) {
                fail("Resposta inválida: array de leituras vazio.");
                return;
              }

              const lastReading = leituras[leituras.length - 1];
              const temperature = Number(lastReading.objeto_C.toFixed(1));
              finish({ temperature, ...classifyTemperature(temperature) });
            } catch (_) {
              fail("Falha ao interpretar resposta do sensor.");
            }
          }
          break;
        }

        case "onError": {
          fail(`Erro USB (${errorCode}): ${errorMessage ?? "desconhecido"}`);
          break;
        }
      }
    });

    try {
      const devices = await serialport.listDevices();
      if (!devices || devices.length === 0) {
        fail("Nenhum dispositivo USB encontrado.");
        return;
      }

      const deviceId: number = (devices[0] as any)?.deviceId ?? (devices[0] as any)?.id ?? -1;
      connectedDeviceId = deviceId;

      serialport.setParams(
        { driver: DriverType.AUTO, baudRate: BAUD_RATE, returnedDataType: ReturnedDataType.UTF8 },
        deviceId,
      );

      serialport.connect(deviceId);

    } catch (err: any) {
      fail(err?.message ?? "Falha ao comunicar com o dispositivo USB.");
    }
  });
}

export default {
  startUsbMeasurement,
};
