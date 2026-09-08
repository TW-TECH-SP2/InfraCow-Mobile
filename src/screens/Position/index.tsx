import { View, Image, StyleSheet } from "react-native";
import Text from "../../components/Text";
import { useEffect, useRef, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import styles from "./styles";

type PositionStatus = "red" | "yellow" | "green";

// Tempo (em segundos) que a tela de posicionamento fica visível
// antes de seguir automaticamente para a medição.
// TODO: remover/ajustar quando a IA de reconhecimento do olho
// passar a controlar esse avanço (ex: só liberar quando status === "green").
const AUTO_ADVANCE_SECONDS = 2;

export default function PositionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const farm = route.params?.farm ?? null;
  const animal = route.params?.animal ?? null;

  const [permission, requestPermission] = useCameraPermissions();

  // Por enquanto fica verde.
  // Futuramente a IA vai alterar esse estado.
  const [positionStatus, setPositionStatus] =
    useState<PositionStatus>("green");

  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_SECONDS);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) return;

    if (secondsLeft <= 0) {
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigation.replace("MeasureScreen", { farm, animal });
      }
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, permission?.granted, navigation, farm, animal]);

  const getEyeImage = () => {
    switch (positionStatus) {
      case "red":
        return require("../../../assets/eyerecognition-red.png");

      case "yellow":
        return require("../../../assets/eyerecognition-yellow.png");

      case "green":
      default:
        return require("../../../assets/eyerecognition-green.png");
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          É necessário permitir o acesso à câmera.
        </Text>

        <Text
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          Permitir câmera
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
      />

      <View style={styles.overlay}>
        <Text style={styles.text}>
          Posicione o dispositivo diante do{"\n"}
          olho esquerdo do bovino
        </Text>

        <Image
          source={getEyeImage()}
          style={styles.eyeImage}
          resizeMode="contain"
        />

        <Text style={styles.countdownText}>{secondsLeft}</Text>
      </View>
    </View>
  );
}