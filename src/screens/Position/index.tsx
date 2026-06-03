import { View, Image } from "react-native";
import Text from "../../components/Text";
import { useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";

export default function PositionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const farm = route.params?.farm ?? null;
  const animal = route.params?.animal ?? null;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("MeasureScreen", {
        farm,
        animal,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [animal, farm, navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/cow-light.png")}
        style={styles.icon}
      />

      <Text style={styles.text}>
        Posicione o dispositivo diante do{"\n"}
        olho esquerdo do bovino
      </Text>
    </View>
  );
}