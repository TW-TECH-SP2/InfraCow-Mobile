
import { View, Image } from "react-native";
import { useEffect, useRef } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import Text from "../../components/Text";
import styles from "./styles";

const AUTO_ADVANCE_SECONDS = 2;

export default function PositionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const farm = route.params?.farm ?? null;
  const animal = route.params?.animal ?? null;

  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;

        navigation.replace("MeasureScreen", {
          farm,
          animal,
        });
      }
    }, AUTO_ADVANCE_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [navigation, farm, animal]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/cow-light.png")}
        style={styles.icon}
        resizeMode="contain"
      />

      <Text style={styles.text}>
        Posicione o dispositivo diante do olho esquerdo do bovino
      </Text>
    </View>
  );
}