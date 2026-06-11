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
import api from "../../services/api";
import { startUsbMeasurement, MeasurementResult } from "../../services/measurementDevice";

type MeasureParams = {
  farm?: any;
  animal?: any;
};

// Função para classificar a temperatura com os MESMOS parâmetros das notificações
const getStatusByTemperature = (temp: number): "success" | "warning" => {
  // Hipotermia (menor ou igual a 34) -> anormal
  if (temp <= 34) {
    return "warning";
  }
  // Febre (maior ou igual a 38.7) -> anormal
  if (temp >= 38.7) {
    return "warning";
  }
  // Entre 34 e 38.7 -> normal
  return "success";
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

  const saveMeasurement = async (temperature: number) => {
    const idAnimal = animal?.id_animal ?? animal?.id ?? null;
    if (!idAnimal) return;

    const now = new Date().toISOString();

    const payload = {
      temp: temperature,
      datahora: now,
      id_animal: idAnimal,
    };

    await api.post("/medicoes", payload);
  };

  const handleMeasure = async () => {
    // Estado resultado → finaliza e salva
    if (status === "success" || status === "warning") {
      try {
        if (lastTemperature !== null && !recordSaved) {
          await saveMeasurement(lastTemperature);
          setRecordSaved(true);
        }
      } catch (_) {
        // Erro no save não bloqueia a navegação
      }
      navigation.navigate("Animal", { animal, farm });
      return;
    }

    // Estado idle → inicia medição
    try {
      setStatus("loading");
      setTemperatureText("...");
      setResultMessage("Medindo... aguarde 10 segundos.");
      setLastTemperature(null);
      setRecordSaved(false);

      const response: MeasurementResult = await startUsbMeasurement();
      const temperature = response.temperature;
      
      // USA A CLASSIFICAÇÃO CORRETA baseada nos parâmetros das notificações
      const correctStatus = getStatusByTemperature(temperature);

      setLastTemperature(temperature);
      setTemperatureText(`${temperature.toFixed(1)}°`);
      setResultMessage(response.message);
      setStatus(correctStatus); // USANDO A CLASSIFICAÇÃO CORRETA, não o response.status
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
      case "success": return "Temperatura Normal!";
      case "warning": return "Temperatura Anormal!";
      default: return "Inicie a medição";
    }
  };

  const getButtonText = () => {
    switch (status) {
      case "loading": return "Medindo, aguarde...";
      case "success":
      case "warning": return "Finalizar";
      default: return "Iniciar medição";
    }
  };

  const getCircleImage = () => {
    switch (status) {
      case "success": return require("../../../assets/eyemeasure-green.png");
      case "warning": return require("../../../assets/eyemeasure-red.png");
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
            status === "warning" && { backgroundColor: "#780406" },
            status === "success" && { backgroundColor: "#3D674A" },
          ]}
          onPress={handleMeasure}
          disabled={status === "loading"}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>

        {(status === "success" || status === "warning") && (
          <TouchableOpacity style={styles.retryContainer} onPress={handleRetry}>
            <Image source={require("../../../assets/retry.png")} style={styles.retryIcon} />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    </ImageBackground>
  );
}