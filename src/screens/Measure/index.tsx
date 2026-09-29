import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import { startUsbMeasurement, MeasurementResult } from "../../services/measurementDevice";
import { generateLocalId, saveMedicaoLocally } from "../../storage/repository";
import { enqueueOperation } from "../../storage/outbox";
import { runSync } from "../../services/syncManager";

type MeasureParams = {
  farm?: any;
  animal?: any;
};


type MeasureStatus = "idle" | "loading" | "low" | "normal" | "high";

const getStatusByTemperature = (temp: number): "low" | "normal" | "high" => {
  if (temp <= 34) return "low"; // hipotermia
  if (temp >= 38.7) return "high"; // hipertermia / febre
  return "normal";
};

const isFinished = (status: MeasureStatus) => status === "low" || status === "normal" || status === "high";

export default function MeasureScreen() {
  const route = useRoute<any>();
  const { animal, farm } = (route.params ?? {}) as MeasureParams;

  const [status, setStatus] = useState<MeasureStatus>("idle");
  const [temperatureText, setTemperatureText] = useState("--");
  const [resultMessage, setResultMessage] = useState("Toque em iniciar para começar a medição.");
  const [lastTemperature, setLastTemperature] = useState<number | null>(null);
  const [recordSaved, setRecordSaved] = useState(false);

  const navigation = useNavigation<any>();


  const saveMeasurement = (temperature: number) => {
    const idAnimal = animal?.id_animal ?? animal?.id ?? null;
    if (!idAnimal) return;

    const now = new Date().toISOString();
    const medicaoPayload = {
      temp: temperature,
      datahora: now,
      id_animal: String(idAnimal),
    };

    const localId = generateLocalId("medicao");
    saveMedicaoLocally(medicaoPayload, localId);

    enqueueOperation({
      entity: "medicao",
      localId,
      method: "post",
      endpoint: "/medicoes",
      payload: medicaoPayload,
    });

    runSync();
  };

  const handleMeasure = async () => {
    if (isFinished(status)) {
      if (lastTemperature !== null && !recordSaved) {
        saveMeasurement(lastTemperature);
        setRecordSaved(true);
      }
      navigation.navigate("Animal", { animal, farm });
      return;
    }

    try {
      setStatus("loading");
      setTemperatureText("...");
      setResultMessage("Medindo... aguarde 10 segundos.");
      setLastTemperature(null);
      setRecordSaved(false);

      const response: MeasurementResult = await startUsbMeasurement();
      const temperature = response.temperature;

      const correctStatus = getStatusByTemperature(temperature);

      setLastTemperature(temperature);
      setTemperatureText(`${temperature.toFixed(1)}°`);
      setResultMessage(response.message);
      setStatus(correctStatus);
    } catch (error: any) {
      setStatus("idle");
      setTemperatureText("--");
      setLastTemperature(null);
      setRecordSaved(false);
      setResultMessage(error?.message ?? "Não foi possível concluir a medição.");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setTemperatureText("--");
    setLastTemperature(null);
    setRecordSaved(false);
    setResultMessage("Toque em iniciar para começar a medição.");
  };

  const getTitle = () => {
    switch (status) {
      case "loading": return "Medindo...";
      case "normal": return "Temperatura Normal!";
      case "low": return "Hipotermia!";
      case "high": return "Hipertermia (febre)!";
      default: return "Inicie a medição";
    }
  };

  const getButtonText = () => {
    switch (status) {
      case "loading": return "Medindo, aguarde...";
      case "normal":
      case "low":
      case "high": return "Finalizar";
      default: return "Iniciar medição";
    }
  };

  const getCircleImage = () => {
    switch (status) {
      case "normal": return require("../../../assets/eyemeasure-green.png");
      case "low": return require("../../../assets/eyemeasure-blue.png");
      case "high": return require("../../../assets/eyemeasure-red.png");
      default: return require("../../../assets/eyemeasure-brown.png");
    }
  };

  return (
    <ImageBackground
      source={require("../../../assets/background-measure.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <Text style={styles.title}>{getTitle()}</Text>

      <View style={styles.content}>
        <View style={styles.circleContainer}>
          <Image source={getCircleImage()} style={styles.circle} />
          <View style={styles.overlay}>
            <Text style={styles.measureText}>
              {status === "loading" ? "..." : status === "idle" ? "--" : temperatureText}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            status === "high" && { backgroundColor: "#780406" },
            status === "low" && { backgroundColor: "#00288E" },
            status === "normal" && { backgroundColor: "#3D674A" },
          ]}
          onPress={handleMeasure}
          disabled={status === "loading"}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>

        {isFinished(status) && (
          <TouchableOpacity style={styles.retryContainer} onPress={handleRetry}>
            <Image source={require("../../../assets/retry.png")} style={styles.retryIcon} />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    </ImageBackground>
  );
}