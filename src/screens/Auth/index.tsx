import { View, TouchableOpacity, Image } from "react-native";
import Text from "../../components/Text";
import styles from "./styles";

export default function AuthScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/back-splash1.png")}
        style={styles.background}
      />

      <View style={styles.content}>
        <Image
          source={require("../../../assets/logo-splash.png")}
          style={styles.logo}
        />

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonTextPrimary}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary}>
          <Text style={styles.textWrapper}>
            Não possui uma conta?{" "}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate("Register")}
            >
              Cadastre-se
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}