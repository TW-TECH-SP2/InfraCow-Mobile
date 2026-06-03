import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_700Bold,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold
} from '@expo-google-fonts/be-vietnam-pro';

import Routes from "./src/navigation";
import offlineQueue from './src/services/offlineQueue';
import auth from './src/services/auth';
import api from './src/services/api';

export default function App() {

  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  React.useEffect(() => {
    let mounted = true;
    let unsubscribe: undefined | (() => void);

    const bootstrap = async () => {
      const token = await auth.getToken();
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      if (!mounted) return;

      unsubscribe = offlineQueue.initQueueListener();
      await offlineQueue.processQueue();
    };

    bootstrap();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Routes />
    </GestureHandlerRootView>
  );
}