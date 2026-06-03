import { View, Image } from "react-native";
import Text from "../../components/Text";
import { useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";

export default function IdentifiedAnimalScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const animal = route.params?.animal ?? null;
  const farm = route.params?.farm ?? null;

  const animalName = animal?.nome_animal ?? animal?.nome ?? "Animal";
  const animalCode = animal?.codigo ?? animal?.id ?? "---";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Position", {
        farm,
        animal,
      });
    }, 3000); // 3 segundos

    return () => clearTimeout(timer);
  }, [animal, farm]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/cow-light.png")}
        style={styles.icon}
      />

      <Text style={styles.text}>
        Animal Identificado:{"\n"}
        {animalName} - cód.: ({animalCode})
      </Text>
    </View>
  );
}