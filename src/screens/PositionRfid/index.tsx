import { View, Image, Alert, Platform } from "react-native";
import Text from "../../components/Text";
import { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import cache from "../../services/cache";
import api from "../../services/api";
import styles from "./styles";

// NFC Manager só disponível em mobile - carrega dinamicamente para evitar erro no web bundle
let NfcManager: any = null;
const loadNfcManager = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('react-native-nfc-manager').default;
  } catch (e) {
    console.warn('[PositionRfid] NFC Manager não disponível');
    return null;
  }
};

type AnimalLike = {
  id_animal?: number | string;
  id?: number | string;
  nome_animal?: string;
  nome?: string;
  codigo?: string | null;
  genero?: string | null;
  tipo?: string | null;
  raca?: string | null;
};

const extractAnimals = (payload: any): AnimalLike[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.animais)) return payload.animais;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function PositionRfidScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [nfcAvailable, setNfcAvailable] = useState(Platform.OS !== 'web');
  const [isReading, setIsReading] = useState(false);

  const farmId = route.params?.farm?.id_fazenda ?? route.params?.farm?.id ?? null;

  // Se for web, não tenta fazer nada de NFC
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Image
          source={require("../../../assets/cow-light.png")}
          style={styles.icon}
        />
        <Text style={styles.text}>
          Leitura de brinco (NFC){"\n"}
          não disponível na web.{"\n\n"}
          Teste em dispositivo Android.
        </Text>
      </View>
    );
  }

  // Resto do código é só para mobile
  useEffect(() => {
    let isActive = true;

    const setupNfc = async () => {
      try {
        const NFC = loadNfcManager();
        if (!NFC) {
          setNfcAvailable(false);
          return;
        }

        await NFC.start();
        setNfcAvailable(true);
      } catch (err) {
        console.warn('[PositionRfid] NFC não disponível:', err);
        setNfcAvailable(false);
        if (isActive) {
          Alert.alert('NFC não disponível', 'Seu dispositivo não possui NFC ou está desabilitado.');
          navigation.goBack();
        }
      }
    };

    setupNfc();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    // Se não estiver disponível, não tenta ler
    if (!nfcAvailable) {
      console.log('[PositionRfid] Pulando leitura NFC (não disponível)');
      return;
    }

    let isActive = true;

    const readNfc = async () => {
      try {
        const NFC = loadNfcManager();
        if (isReading || !NFC) return;
        setIsReading(true);

        console.log('[PositionRfid] Aguardando leitura NFC...');
        
        // Prepara para ler uma tag NDEF
        const tag = await NFC.requestTag();
        
        if (!isActive) return;

        console.log('[PositionRfid] Tag lida:', tag);
        
        // Extrai a mensagem NDEF
        let rfidCode = '';
        if (tag?.ndefMessage && Array.isArray(tag.ndefMessage)) {
          for (const record of tag.ndefMessage) {
            if (record.type === 'T') {
              // Texto
              rfidCode = record.payload?.decoded || '';
              break;
            } else if (record.type === 'U') {
              // URI
              rfidCode = record.payload?.decoded || '';
              break;
            }
          }
        }

        // Se não encontrou NDEF, tenta usar o ID da tag como fallback
        if (!rfidCode && tag?.id) {
          rfidCode = tag.id.replace(/\s+/g, '').toUpperCase();
        }

        if (!rfidCode) {
          if (isActive) {
            Alert.alert('Erro', 'Não foi possível ler o código do brinco.');
            setIsReading(false);
          }
          return;
        }

        console.log('[PositionRfid] RFID code extraído:', rfidCode);

        // Busca animal pelo código (RFID) no cache ou API
        let animal: AnimalLike | null = null;
        
        // Tenta cache de todos os animais
        const cacheKey = "/animais";
        const cachedAnimalsRaw = await cache.getCache(cacheKey);
        let allAnimals = extractAnimals(cachedAnimalsRaw);

        // Se não tem em cache, busca da API
        if (!allAnimals || allAnimals.length === 0) {
          try {
            const resp = await api.get('/animais');
            allAnimals = extractAnimals(resp.data);
            if (allAnimals.length > 0) {
              await cache.setCache(cacheKey, allAnimals);
            }
          } catch (err) {
            console.warn('[PositionRfid] Erro ao buscar animais na API:', err);
            allAnimals = [];
          }
        }

        // Filtra apenas animais da fazenda se farmId foi fornecido
        const farmAnimals = farmId
          ? allAnimals.filter((a) => String(a.id_fazenda ?? '') === String(farmId))
          : allAnimals;

        // Busca por código ou ID matching
        animal = farmAnimals.find((a) => {
          const animalCode = String(a.codigo ?? '').trim().toUpperCase();
          const animalId = String(a.id_animal ?? a.id ?? '').trim().toUpperCase();
          return animalCode === rfidCode || animalId === rfidCode;
        }) || null;

        if (!animal) {
          if (isActive) {
            Alert.alert('Animal não encontrado', `Nenhum animal encontrado com código/ID: ${rfidCode}`);
            setIsReading(false);
          }
          return;
        }

        console.log('[PositionRfid] Animal encontrado:', animal);
        
        if (isActive) {
          navigation.replace('IdentifiedAnimal', {
            animal,
            farm: route.params?.farm,
          });
        }
      } catch (err: any) {
        console.warn('[PositionRfid] Erro ao ler NFC:', err);
        if (isActive && !err?.message?.includes('Cancel')) {
          Alert.alert('Erro na leitura', 'Erro ao ler o brinco. Tente novamente.');
        }
        setIsReading(false);
      }
    };

    readNfc();

    return () => {
      isActive = false;
    };
  }, [nfcAvailable, route.params]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/cow-light.png")}
        style={styles.icon}
      />

      <Text style={styles.text}>
        Posicione o dispositivo diante do{"\n"}
        brinco do bovino
      </Text>
      
      {isReading && (
        <Text style={{ marginTop: 20, fontSize: 12, color: '#666', textAlign: 'center' }}>
          Lendo...
        </Text>
      )}
    </View>
  );
}