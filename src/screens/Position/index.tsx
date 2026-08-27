import { View, Image, StyleSheet } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import { useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import styles from "./styles";

type PositionStatus = "red" | "yellow" | "green";

export default function PositionScreen() {
  const route = useRoute<any>();

  const farm = route.params?.farm ?? null;
  const animal = route.params?.animal ?? null;

  const [permission, requestPermission] = useCameraPermissions();

  // Por enquanto fica verde.
  // Futuramente a IA vai alterar esse estado.
  const [positionStatus, setPositionStatus] =
    useState<PositionStatus>("green");

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
      </View>
    </View>
  );
}