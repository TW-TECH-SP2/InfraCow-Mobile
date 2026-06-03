import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import NetInfo from '@react-native-community/netinfo';
import styles from "./styles";
import api from "../../services/api";
import offlineQueue from "../../services/offlineQueue";
import { startMockMeasurement, MeasurementResult } from "../../services/measurementDevice";

type MeasureParams = {
  farm?: any;
  animal?: any;
};

export default function MeasureScreen() {
  const route = useRoute<any>();
  const { animal, farm } = (route.params ?? {}) as MeasureParams;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "warning">("idle");
  const [temperatureText, setTemperatureText] = useState("--");
  const [resultMessage, setResultMessage] = useState("Toque em iniciar para começar a medição.");
  const [lastTemperature, setLastTemperature] = useState<number | null>(null);
  const [recordSaved, setRecordSaved] = useState(false);
  const navigation = useNavigation<any>();

  const getTemperatureValue = (value: string) => {
    const parsed = Number(String(value).replace("°", ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const saveMeasurement = async (temperature: number) => {
    const idAnimal = animal?.id_animal ?? animal?.id ?? null;
    if (!idAnimal) return;

    const payload = {
      temp: temperature,
      datahora: new Date().toISOString(),
      id_animal: idAnimal,
    };

    const networkState = await NetInfo.fetch();
    const isConnected = Boolean(networkState.isConnected);

    if (!isConnected) {
      await offlineQueue.enqueue({
        id: `medicao_${Date.now()}`,
        endpoint: "/medicoes",
        method: "post",
        fields: payload,
      });
      return;
    }

    await api.post("/medicoes", payload, { timeout: 30000 });
  };

  const handleMeasure = async () => {
    if (status === "success" || status === "warning") {
      if (lastTemperature !== null && !recordSaved) {
        try {
          await saveMeasurement(lastTemperature);
          setRecordSaved(true);
        } catch (saveError) {
          setResultMessage("Não foi possível salvar o registro da medição.");
          return;
        }
      }

      navigation.navigate("Home");
      return;
    }

    try {
      setStatus("loading");
      setTemperatureText("...");
      setResultMessage("Aguardando resposta do dispositivo...");

      const response: MeasurementResult = await startMockMeasurement(animal);
      setStatus(response.status);
      const formattedTemperature = `${response.temperature.toFixed(1)}°`;
      setTemperatureText(formattedTemperature);
      setLastTemperature(response.temperature);
      setRecordSaved(false);
      setResultMessage(response.message);
    } catch (error) {
      setStatus("idle");
      setTemperatureText("--");
      setLastTemperature(null);
      setRecordSaved(false);
      setResultMessage("Não foi possível concluir a medição.");
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
      case "loading":
        return "Carregando...";
      case "success":
        return "Temperatura Normal!";
      case "warning":
        return "Temperatura Anormal!";
      default:
        return "Inicie a medição";
    }
  };

  const getButtonText = () => {
    switch (status) {
      case "loading":
        return "Medindo, aguarde...";
      case "success":
      case "warning":
        return "Finalizar"; 
      default:
        return "Iniciar medição";
    }
  };

  const getCircleImage = () => {
    switch (status) {
      case "success":
        return require("../../../assets/eyemeasure-green.png");
      case "warning":
        return require("../../../assets/eyemeasure-red.png");
      default:
        return require("../../../assets/eyemeasure-brown.png");
    }
  };

  const getMeasureText = () => {
    switch (status) {
      case "loading":
        return "...";
      case "success":
      case "warning":
        return temperatureText;
      default:
        return "--";
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
            <Text style={styles.measureText}>{getMeasureText()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            status === "warning" && { backgroundColor: "#780406" },
            status === "success" && { backgroundColor: "#3D674A" },
          ]}
          onPress={handleMeasure}
          disabled={status === "loading"}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>

        {(status === "success" || status === "warning") && (
          <TouchableOpacity
            style={styles.retryContainer}
            onPress={handleRetry}
          >
            <Image
              source={require("../../../assets/retry.png")} 
              style={styles.retryIcon}
            />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    </ImageBackground>
  );
}