import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Updates from 'expo-updates';

import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_700Bold,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold
} from '@expo-google-fonts/be-vietnam-pro';

import Routes from "./src/navigation";
import auth from './src/services/auth';

export default function App() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  React.useEffect(() => {
    const bootstrap = async () => {
      await auth.restoreToken();

      if (!__DEV__) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (e) {
          // Sem internet — continua normalmente
        }
      }
    };

    bootstrap();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Routes />
    </GestureHandlerRootView>
  );
}
