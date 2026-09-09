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
import { initDb } from './src/storage/db';
import { startSyncListener } from './src/services/syncManager';

export default function App() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  React.useEffect(() => {
    const bootstrap = async () => {
      // Cria as tabelas locais (fazendas, animais, medições, outbox,
      // notificações) se ainda não existirem. Tem que ser a PRIMEIRA coisa
      // — sem isso, qualquer leitura/escrita no SQLite quebra com "no such
      // table". É rápido e síncrono, não precisa de await.
      initDb();

      // Sincroniza automaticamente sempre que a conexão voltar (ex: saiu
      // do modo avião no pasto). Sem isso, a fila do outbox só é drenada
      // quando alguma tela específica focar e chamar runSync() por conta
      // própria.
      startSyncListener();

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
