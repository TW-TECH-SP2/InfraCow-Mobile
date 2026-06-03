import { View, Image, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import React from "react";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import cache from "../../services/cache";
import Constants from 'expo-constants';

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

  if (/^https?:\/\//i.test(normalized)) {
    return { uri: normalized };
  }

  const withoutLeadingSlashes = normalized.replace(/^\/+/, '');
  const normalizedPath = withoutLeadingSlashes.replace(/\\/g, '/');
  const path = normalizedPath.startsWith('uploads/') ? normalizedPath : `uploads/${normalizedPath}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');

  return { uri: `${baseUrl}/${path}` };
};

const mergeCachedLocalImages = (freshFarms: FarmItem[], cachedFarms: FarmItem[]) => {
  return freshFarms.map((farm) => {
    const cachedFarm = cachedFarms.find((item) => String(item.id_fazenda ?? item.clientTempId ?? '') === String(farm.id_fazenda));
    return {
      ...cachedFarm,
      ...farm,
      localImageUri: cachedFarm?.localImageUri ?? farm.localImageUri ?? null,
      pendingSync: cachedFarm?.pendingSync ?? farm.pendingSync ?? false,
      clientTempId: cachedFarm?.clientTempId ?? farm.clientTempId ?? null,
    };
  });
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

  return (
    <Image source={src} style={styles.cardImage} onError={() => setImgError(true)} />
  );
};

export default function HomeScreen() {
  const [farms, setFarms] = useState<FarmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  const loadFarms = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const cached = await cache.getCache('/fazendas');
    const cachedFarms = Array.isArray(cached)
      ? cached
      : Array.isArray(cached?.fazendas)
        ? cached.fazendas
        : Array.isArray(cached?.data)
          ? cached.data
          : [];

    if (cachedFarms.length > 0) {
      setFarms(cachedFarms);
    }

    try {
      const response = await api.get('/fazendas');
      const farmsData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.fazendas)
          ? response.data.fazendas
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

      const pendingFarms = cachedFarms.filter((farm) => farm.pendingSync === true);
      const serverIds = new Set(farmsData.map((farm) => String(farm.id_fazenda)));
      const trulyPending = pendingFarms.filter(
        (farm) => !serverIds.has(String(farm.id_fazenda)) && !serverIds.has(String(farm.clientTempId))
      );

      const merged = mergeCachedLocalImages(farmsData, cachedFarms);
      const final = [...merged, ...trulyPending];

      await cache.setCache('/fazendas', final);
      setFarms(final);
    } catch (err) {
      if (cachedFarms.length === 0) {
        setErrorMessage('Não foi possível carregar suas fazendas.');
      } else {
        setErrorMessage('Mostrando dados salvos offline.');
      }
    } finally {
      setLoading(false);
    }
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

      <TouchableOpacity style={styles.button}
        onPress={() => navigation.navigate("RegisterFarm")}
      >
        <Image
          source={require("../../../assets/plus.png")} 
          style={styles.plus}
        />
        <Text style={styles.buttonText}>Cadastrar nova Fazenda</Text>
      </TouchableOpacity>

      <FlatList
        data={farms}
        keyExtractor={(item) => String(item.id_fazenda)}
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