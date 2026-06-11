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

// Instância única — conexão USB mantida entre medições
const serialport = new Serialport();
let activeDeviceId = -1;

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
  // Remove listener anterior — nunca acumula callbacks
  try { serialport.stopListening(); } catch (_) {}

  return new Promise(async (resolve, reject) => {
    let receivedData = "";
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: MeasurementResult) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
      // Só remove o listener — mantém a conexão USB aberta para a próxima medição
      try { serialport.stopListening(); } catch (_) {}
      resolve(result);
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; }
      try { serialport.stopListening(); } catch (_) {}
      // Em caso de erro, desconecta de verdade para forçar reconexão limpa
      try { serialport.disconnect(activeDeviceId); } catch (_) {}
      activeDeviceId = -1;
      reject(new Error(msg));
    };

    timeoutHandle = setTimeout(() => {
      fail("Timeout: o dispositivo não respondeu a tempo.");
    }, MEASUREMENT_TIMEOUT_MS);

    serialport.startListening(({ type, deviceId, portInterface, errorCode, errorMessage, data }) => {
      if (settled) return;

      switch (type) {
        case "onConnected": {
          // Primeira conexão ou reconexão após erro
          activeDeviceId = deviceId ?? activeDeviceId;
          serialport.writeString("MEDIR\n", activeDeviceId, portInterface ?? 0);
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

      serialport.setParams(
        { driver: DriverType.AUTO, baudRate: BAUD_RATE, returnedDataType: ReturnedDataType.UTF8 },
        deviceId,
      );

      const alreadyConnected = activeDeviceId === deviceId
        ? await serialport.isConnected(deviceId).catch(() => false)
        : false;

      if (alreadyConnected) {
        // Porta já aberta — manda direto o comando
        activeDeviceId = deviceId;
        serialport.writeString("MEDIR\n", activeDeviceId, 0);
      } else {
        // Primeira vez ou após erro — conecta normalmente (pode mostrar diálogo USB)
        activeDeviceId = deviceId;
        serialport.connect(deviceId);
      }

    } catch (err: any) {
      fail(err?.message ?? "Falha ao comunicar com o dispositivo USB.");
    }
  });
}

export default {
  startUsbMeasurement,
};
