import { View, Image, Alert, Platform, TouchableOpacity } from "react-native";
import Text from "../../components/Text";
import { useEffect, useState, useRef } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../services/api";
import styles from "./styles";

/**
 * PositionRfidScreen — leitura NFC/RFID com react-native-nfc-manager v3.x
 *
 * Parâmetros (route.params):
 *   mode: 'identify' | 'register'
 *     - 'identify': busca o animal no banco e navega para IdentifiedAnimal
 *     - 'register': devolve o código lido para RegisterAnimal via navigate
 *   farm: objeto da fazenda (usado no mode 'identify')
 */
export default function PositionRfidScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [status, setStatus] = useState<'aguardando' | 'lendo' | 'erro'>('aguardando');
  const [mensagem, setMensagem] = useState('Aproxime o dispositivo do brinco do animal');
  const isActiveRef = useRef(true);

  const mode: 'identify' | 'register' = route.params?.mode ?? 'identify';
  const farmId = route.params?.farm?.id_fazenda ?? route.params?.farm?.id ?? null;

  // Web: NFC não disponível
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Image source={require("../../../assets/cow-light.png")} style={styles.icon} />
        <Text style={styles.text}>
          Leitura NFC não disponível na web.{"\n\n"}
          Teste em dispositivo Android.
        </Text>
      </View>
    );
  }

  const cancelar = async () => {
    isActiveRef.current = false;
    try {
      const NfcManager = require('react-native-nfc-manager').default;
      await NfcManager.cancelTechnologyRequest().catch(() => {});
    } catch {}
    navigation.goBack();
  };

  const lerTag = async () => {
    let NfcManager: any;
    let NfcTech: any;

    try {
      const nfcLib = require('react-native-nfc-manager');
      NfcManager = nfcLib.default;
      NfcTech = nfcLib.NfcTech;
    } catch (e) {
      setMensagem('Biblioteca NFC não disponível neste build.');
      setStatus('erro');
      return;
    }

    try {
      // Inicia o NFC se ainda não foi iniciado
      await NfcManager.start();
    } catch (e) {
      // start() pode lançar se já foi chamado antes — ignorar
    }

    // Verifica se NFC está disponível no dispositivo
    let nfcSupported = false;
    try {
      nfcSupported = await NfcManager.isSupported();
    } catch {}

    if (!nfcSupported) {
      setMensagem('Este dispositivo não possui NFC.');
      setStatus('erro');
      return;
    }

    let nfcEnabled = false;
    try {
      nfcEnabled = await NfcManager.isEnabled();
    } catch {}

    if (!nfcEnabled) {
      Alert.alert(
        'NFC desabilitado',
        'Ative o NFC nas configurações do dispositivo e tente novamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    setStatus('lendo');
    setMensagem('Aproxime o dispositivo do brinco...');

    try {
      // Solicita tecnologia NDEF (padrão para tags NFC comuns)
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Lê a tag
      const tag = await NfcManager.getTag();

      if (!isActiveRef.current) return;

      console.log('[PositionRfid] Tag lida:', JSON.stringify(tag));

      // Extrai o código da tag
      let rfidCode = '';

      // Tenta extrair texto do payload NDEF
      if (tag?.ndefMessage && Array.isArray(tag.ndefMessage) && tag.ndefMessage.length > 0) {
        const record = tag.ndefMessage[0];
        if (record?.payload) {
          // payload é array de bytes — converte para string
          const payload: number[] = Array.from(record.payload);
          // Remove o byte de status (primeiro byte em text records)
          const langCodeLength = payload[0] & 0x3f;
          const textBytes = payload.slice(1 + langCodeLength);
          rfidCode = textBytes.map((b: number) => String.fromCharCode(b)).join('').trim();
        }
      }

      // Fallback: usa o ID da tag (série de bytes em hex)
      if (!rfidCode && tag?.id) {
        rfidCode = Array.from(tag.id as number[])
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      }

      if (!rfidCode) {
        setMensagem('Não foi possível extrair o código da tag.');
        setStatus('erro');
        return;
      }

      console.log('[PositionRfid] Código extraído:', rfidCode);

      // ── mode: 'register' ─────────────────────────────────────────────────
      if (mode === 'register') {
        navigation.navigate('RegisterAnimal', {
          farm: route.params?.farm,
          rfidCode,
        });
        return;
      }

      // ── mode: 'identify' ─────────────────────────────────────────────────
      setMensagem('Identificando animal...');

      const resp = await api.get('/animais');
      const allAnimals = Array.isArray(resp.data)
        ? resp.data
        : Array.isArray(resp.data?.animais)
        ? resp.data.animais
        : [];

      const farmAnimals = farmId
        ? allAnimals.filter((a: any) => String(a.id_fazenda ?? '') === String(farmId))
        : allAnimals;

      const animal = farmAnimals.find((a: any) => {
        const code = String(a.codigo ?? '').trim().toUpperCase();
        const id = String(a.id_animal ?? a.id ?? '').trim().toUpperCase();
        return code === rfidCode.toUpperCase() || id === rfidCode.toUpperCase();
      });

      if (!animal) {
        Alert.alert(
          'Animal não encontrado',
          `Nenhum animal com código: ${rfidCode}`,
          [
            { text: 'Tentar novamente', onPress: () => { setStatus('aguardando'); setMensagem('Aproxime o dispositivo do brinco do animal'); lerTag(); } },
            { text: 'Cancelar', onPress: () => navigation.goBack() },
          ]
        );
        return;
      }

      navigation.replace('IdentifiedAnimal', {
        animal,
        farm: route.params?.farm,
      });

    } catch (err: any) {
      if (!isActiveRef.current) return;
      console.warn('[PositionRfid] Erro:', err);

      const cancelado = err?.message?.toLowerCase().includes('cancel')
        || err?.message?.toLowerCase().includes('usercancel');

      if (!cancelado) {
        setMensagem('Erro ao ler o brinco. Tente novamente.');
        setStatus('erro');
      } else {
        navigation.goBack();
      }
    } finally {
      // Sempre libera a tecnologia ao terminar
      try {
        const NfcManager2 = require('react-native-nfc-manager').default;
        await NfcManager2.cancelTechnologyRequest().catch(() => {});
      } catch {}
    }
  };

  // Inicia leitura ao entrar na tela
  useEffect(() => {
    isActiveRef.current = true;
    lerTag();
    return () => {
      isActiveRef.current = false;
      try {
        const NfcManager = require('react-native-nfc-manager').default;
        NfcManager.cancelTechnologyRequest().catch(() => {});
      } catch {}
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require("../../../assets/cow-light.png")} style={styles.icon} />

      <Text style={styles.text}>{mensagem}</Text>

      {status === 'lendo' && (
        <Text style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
          Aguardando leitura...
        </Text>
      )}

      {status === 'erro' && (
        <TouchableOpacity
          onPress={() => { setStatus('aguardando'); setMensagem('Aproxime o dispositivo do brinco do animal'); lerTag(); }}
          style={{ marginTop: 24, backgroundColor: '#282113', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tentar novamente</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={cancelar} style={{ marginTop: 20, padding: 12 }}>
        <Text style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
