import { View, Image } from "react-native";
import { useEffect, useState } from "react";
import styles from "./styles";
import auth from "../../services/auth";
import api from "../../services/api";

export default function SplashScreen({ navigation }: any) {
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    let active = true;
    const minimumDisplayTime = 1000;

    const checkSession = async () => {
      setShowLogo(true);
      const startedAt = Date.now();

      const token = await auth.getToken();
      if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const elapsed = Date.now() - startedAt;
      if (elapsed < minimumDisplayTime) {
        await new Promise((resolve) => setTimeout(resolve, minimumDisplayTime - elapsed));
      }

      if (!active) return;

      navigation.replace(token ? "Home" : "Auth");
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/back-splash1.png")}
        style={styles.background}
      />

      {showLogo && (
        <Image
          source={require("../../../assets/logo-splash.png")}
          style={styles.logo}
        />
      )}
    </View>
  );
}