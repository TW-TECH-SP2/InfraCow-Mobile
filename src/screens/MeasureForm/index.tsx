import { View, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Navbar from "../../components/Navbar";
import styles from "./styles";
import api from "../../services/api";
import cache from "../../services/cache";
import Constants from "expo-constants";

type FarmItem = {
  id_fazenda?: number | string;
  id?: number | string;
  nome_fazenda?: string;
  name?: string;
  imagem?: string | null;
  image?: string | null;
  localImageUri?: string | null;
};

const DEFAULT_FARM_IMAGE = require("../../../assets/farm1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveFarmImage = (image?: string | null) => {
  if (!image) return DEFAULT_FARM_IMAGE;

  const normalized = String(image).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return DEFAULT_FARM_IMAGE;
  }

  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) {
    return { uri: normalized };
  }

  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  return { uri: `${baseUrl}/${path}` };
};

const normalizeFarms = (payload: any): FarmItem[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.fazendas)) return payload.fazendas;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function MeasureForm() {
  const [open, setOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmItem | null>(null);
  const [farms, setFarms] = useState<FarmItem[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const navigation = useNavigation<any>();
  const autoRedirectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadFarms = async () => {
      setLoadingFarms(true);

      try {
        const response = await api.get("/fazendas");
        const farmsData = normalizeFarms(response.data);
        const cachedRaw = await cache.getCache("/fazendas");
        const cachedFarms = normalizeFarms(cachedRaw);

        const cachedById = new Map(cachedFarms.map((farm) => [String(farm.id_fazenda ?? farm.id), farm]));
        const merged = farmsData.map((farm) => {
          const cachedFarm = cachedById.get(String(farm.id_fazenda ?? farm.id));
          return {
            ...cachedFarm,
            ...farm,
            localImageUri: cachedFarm?.localImageUri ?? farm.localImageUri ?? null,
          };
        });

        if (mounted) {
          setFarms(merged);
        }

        await cache.setCache("/fazendas", merged);
        return;
      } catch (error) {
        console.warn("[MeasureForm] Falha ao carregar fazendas via API, usando cache", error);

        const cachedRaw = await cache.getCache("/fazendas");
        const cachedFarms = normalizeFarms(cachedRaw);

        if (mounted) {
          setFarms(cachedFarms);
        }
      } finally {
        if (mounted) {
          setLoadingFarms(false);
        }
      }
    };

    loadFarms();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loadingFarms || autoRedirectedRef.current) return;

    if (farms.length === 1) {
      autoRedirectedRef.current = true;
      const onlyFarm = farms[0];
      setSelectedFarm(onlyFarm);
      navigation.replace("MeasureSelectAnimal", {
        farm: onlyFarm,
      });
    }
  }, [farms, loadingFarms, navigation]);

  const handleSelect = (farm: any) => {
    setSelectedFarm(farm);
    setOpen(false);
  };

  const handleNext = () => {
  if (!selectedFarm) return;

  navigation.navigate("MeasureSelectAnimal", {
    farm: selectedFarm, 
  });
};

return (
  <ScrollView
    contentContainerStyle={{ flexGrow: 1 }}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Medir</Text>
          <Text style={styles.title}>Temperatura</Text>
        </View>

        <Image
          source={require("../../../assets/logoescura 1.png")}
          style={styles.logo}
        />
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitle}>
        Preencha o formulário seguindo as etapas:
      </Text>

      {loadingFarms ? (
        <View style={{ paddingVertical: 28 }}>
          <ActivityIndicator size="large" color="#6b6b40" />
        </View>
      ) : farms.length === 0 ? (
        <Text style={styles.subtitle}>Nenhuma fazenda encontrada.</Text>
      ) : (
        <>
          {/* SELECT */}
          <View style={styles.selectWrapper}>
            <TouchableOpacity
              style={[styles.select, open && styles.selectOpen]}
              onPress={() => setOpen(!open)}
            >
              <View style={styles.selectedContent}>
                {selectedFarm && (
                  <Image
                    source={selectedFarm.localImageUri ? { uri: selectedFarm.localImageUri } : resolveFarmImage(selectedFarm.imagem ?? selectedFarm.image ?? null)}
                    style={styles.selectedImage}
                  />
                )}

                <Text style={styles.selectText}>
                  {selectedFarm ? selectedFarm.nome_fazenda ?? selectedFarm.name ?? "Fazenda selecionada" : "Selecione uma fazenda:"}
                </Text>
              </View>

              <Image
                source={require("../../../assets/arrow-down.png")}
                style={styles.arrowselect}
              />
            </TouchableOpacity>

            {open && (
              <View style={styles.dropdown}>
                {farms.map((item) => (
                  <TouchableOpacity
                    key={String(item.id_fazenda ?? item.id)}
                    style={styles.option}
                    onPress={() => handleSelect(item)}
                  >
                    <Image
                      source={item.localImageUri ? { uri: item.localImageUri } : resolveFarmImage(item.imagem ?? item.image ?? null)}
                      style={styles.optionImage}
                    />
                    <Text style={styles.optionText}>{item.nome_fazenda ?? item.name ?? "Fazenda"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* BOTÃO */}
          <TouchableOpacity
            style={[
              styles.button,
              !selectedFarm && { opacity: 0.5 }
            ]}
            onPress={handleNext}
            disabled={!selectedFarm}
          >
            <Text style={styles.buttonText}>Próxima Etapa</Text>
          </TouchableOpacity>
        </>
      )}

      {/* NAVBAR */}
      <Navbar active="measure" />

    </View>
  </ScrollView>
);
}