import { View, Image, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import React from "react";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import cache from "../../services/cache";
import offlineQueue, { syncEvents } from "../../services/offlineQueue";
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import api from "../../services/api";

type FarmItem = {
  id_fazenda: number | string;
  nome_fazenda: string;
  rua?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  CEP?: string | null;
  numero?: string | number | null;
  imagem?: string | null;
  localImageUri?: string | null;
  pendingSync?: boolean;
  clientTempId?: string | null;
};

const FALLBACK_IMAGE = require("../../../assets/farm1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? 'https://infracow-api-hv24.onrender.com';
};

const resolveFarmImage = (image?: string | null) => {
  if (!image) return FALLBACK_IMAGE;
  const normalized = String(image).trim();
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
    return FALLBACK_IMAGE;
  }
  if (/^https?:\/\//i.test(normalized)) return { uri: normalized };
  const withoutLeadingSlashes = normalized.replace(/^\/+/, '');
  const normalizedPath = withoutLeadingSlashes.replace(/\\/g, '/');
  const path = normalizedPath.startsWith('uploads/') ? normalizedPath : `uploads/${normalizedPath}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  return { uri: `${baseUrl}/${path}` };
};

const formatAddress = (farm: FarmItem) => {
  const parts = [farm.rua, farm.bairro].filter(Boolean).join(', ');
  const city = farm.cidade?.trim();
  if (parts && city) return `${parts} - ${city}`;
  return parts || city || 'Endereço não informado';
};

const FarmImage = ({ item }: { item: FarmItem }) => {
  const [imgError, setImgError] = useState(false);
  const src = item.localImageUri
    ? { uri: item.localImageUri }
    : imgError
    ? FALLBACK_IMAGE
    : resolveFarmImage(item.imagem);
  return <Image source={src} style={styles.cardImage} onError={() => setImgError(true)} />;
};

export default function HomeScreen() {
  const [farms, setFarms] = useState<FarmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  const loadFarms = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    // 1. Ler cache local primeiro — mostrar imediatamente (inclui pendentes)
    const cachedRaw = await cache.getCache('/fazendas');
    const cachedFarms: FarmItem[] = Array.isArray(cachedRaw)
      ? cachedRaw
      : Array.isArray(cachedRaw?.fazendas)
        ? cachedRaw.fazendas
        : Array.isArray(cachedRaw?.data)
          ? cachedRaw.data
          : [];

    if (cachedFarms.length > 0) {
      setFarms(cachedFarms);
    }

    // 2. Verificar conectividade
    const netState = await NetInfo.fetch();
    const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

    if (!isOnline) {
      setErrorMessage(cachedFarms.length > 0 ? 'Sem internet — mostrando dados salvos.' : 'Sem internet e sem dados salvos.');
      setLoading(false);
      return;
    }

    // 3. Online: buscar da API
    try {
      const response = await api.get('/fazendas');

      const freshFarms: FarmItem[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.fazendas)
          ? response.data.fazendas
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

      const serverIds = new Set(freshFarms.map((f) => String(f.id_fazenda)));

      // Preservar itens pendentes que o servidor ainda não confirmou
      const stillPending = cachedFarms.filter((f) => {
        if (!f.pendingSync) return false;
        if (serverIds.has(String(f.id_fazenda))) return false;
        if (f.clientTempId && serverIds.has(f.clientTempId)) return false;
        return true;
      });

      // Mesclar preservando localImageUri do cache local
      const mergedFresh = freshFarms.map((serverFarm) => {
        const local = cachedFarms.find(
          (c) => String(c.id_fazenda) === String(serverFarm.id_fazenda)
        );
        return {
          ...serverFarm,
          localImageUri: local?.localImageUri ?? serverFarm.localImageUri ?? null,
          pendingSync: false,
          clientTempId: null,
        };
      });

      const final = [...mergedFresh, ...stillPending];

      await cache.setCache('/fazendas', final);
      setFarms(final);

      // Aproveitar conexão para processar fila offline
      offlineQueue.processQueue();

    } catch (err) {
      if (cachedFarms.length === 0) {
        setErrorMessage('Não foi possível carregar fazendas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Escutar eventos de sync em background ────────────────────────────────
  // Quando o processQueue sincronizar uma fazenda com o servidor (ex: usuário
  // cadastrou offline e depois reconectou), atualiza a lista da tela.
  // Isso é o equivalente do "double tick azul" do WhatsApp — confirmação chega
  // depois, sem o usuário precisar recarregar.
  React.useEffect(() => {
    const refreshFromCache = async () => {
      const cachedRaw = await cache.getCache('/fazendas');
      const updated: FarmItem[] = Array.isArray(cachedRaw)
        ? cachedRaw
        : Array.isArray(cachedRaw?.fazendas)
          ? cachedRaw.fazendas
          : [];
      if (updated.length > 0) {
        setFarms(updated);
      }
    };

    const sub1 = syncEvents.on('farmSynced', refreshFromCache);
    const sub2 = syncEvents.on('queueProcessed', refreshFromCache);

    return () => {
      syncEvents.off('farmSynced', refreshFromCache);
      syncEvents.off('queueProcessed', refreshFromCache);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadFarms();
    }, [loadFarms])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Bem-vindo ao{"\n"}Infracow
        </Text>
        <Image
          source={require("../../../assets/logoescura 1.png")}
          style={styles.logo}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("RegisterFarm")}>
        <Image source={require("../../../assets/plus.png")} style={styles.plus} />
        <Text style={styles.buttonText}>Cadastrar nova Fazenda</Text>
      </TouchableOpacity>

      <FlatList
        data={farms}
        keyExtractor={(item) => String(item.clientTempId ?? item.id_fazenda)}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={loadFarms}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 28 }}>
              <ActivityIndicator size="large" color="#6b6b40" />
            </View>
          ) : (
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <Text style={styles.cardText}>
                {errorMessage || 'Você ainda não cadastrou fazendas.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <FarmImage item={item} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.nome_fazenda}</Text>
              <Text style={styles.cardText}>{formatAddress(item)}</Text>
              <Text style={styles.cardCity}>{item.CEP ? `CEP ${item.CEP}` : ' '}</Text>
              {item.pendingSync && (
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  Sincronizando...
                </Text>
              )}
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => navigation.navigate("Farm", { farm: item })}
              >
                <Text style={styles.cardButtonText}>Gerenciar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Navbar active="home" />
    </View>
  );
}
