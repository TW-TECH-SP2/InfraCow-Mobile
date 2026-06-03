import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
  ImageSourcePropType,
  Modal,
  Alert,
  Platform,
} from "react-native";
import styles from "./styles";
import { LinearGradient } from "expo-linear-gradient";
import Navbar from "../../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import cache from "../../services/cache";
import api from "../../services/api";
import offlineQueue from "../../services/offlineQueue";
import auth from "../../services/auth";
import NetInfo from '@react-native-community/netinfo';
import Constants from "expo-constants";

type FarmItem = {
  id_fazenda?: number | string;
  nome_fazenda?: string;
  name?: string;
  imagem?: string | null;
  image?: string | null;
  localImageUri?: string | null;
  total?: number | string | null;
  females?: number | string | null;
  males?: number | string | null;
  total_animais?: number | string | null;
  totalAnimals?: number | string | null;
  quant_total?: number | string | null;
  quant_animais?: number | string | null;
  quant_femeas?: number | string | null;
  quant_machos?: number | string | null;
  femaleCount?: number | string | null;
  maleCount?: number | string | null;
  averageTemperature?: number | null;
  temperatura_media?: number | null;
};

const DEFAULT_FARM_IMAGE = require("../../../assets/farm1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveFarmImage = (image?: string | null): ImageSourcePropType => {
  if (!image) return DEFAULT_FARM_IMAGE;

  const normalized = String(image).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return DEFAULT_FARM_IMAGE;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return { uri: normalized };
  }

  if (/^(file:|blob:|data:)/i.test(normalized)) {
    return { uri: normalized };
  }

  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  return { uri: `${baseUrl}/${path}` };
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getFirstNumber = (...values: unknown[]) => {
  for (const value of values) {
    const num = toNumber(value);
    if (num > 0) return num;
  }
  return 0;
};

const normalizeFarm = (farm?: FarmItem | null) => ({
  id_fazenda: farm?.id_fazenda ?? "",
  nome_fazenda: farm?.nome_fazenda ?? farm?.name ?? "Fazenda",
  imagem: farm?.localImageUri ?? farm?.imagem ?? farm?.image ?? null,
  total: getFirstNumber(farm?.total, farm?.total_animais, farm?.totalAnimals, farm?.quant_total, farm?.quant_animais),
  females: getFirstNumber(farm?.females, farm?.femaleCount, farm?.quant_femeas),
  males: getFirstNumber(farm?.males, farm?.maleCount, farm?.quant_machos),
  averageTemperature: farm?.averageTemperature ?? farm?.temperatura_media ?? null,
});

const getTemperatureData = (temp?: number | null) => {
  if (temp === null || temp === undefined) {
    return {
      image: require("../../../assets/chart.png"),
      text: "--",
      color: "#ccc",
    };
  }

  if (temp <= 34) {
    return {
      image: require("../../../assets/chart-blue.png"),
      text: `${temp.toFixed(1)}°C`,
      color: "#fff",
    };
  }

  if (temp <= 38) {
    return {
      image: require("../../../assets/chart-green.png"),
      text: `${temp.toFixed(1)}°C`,
      color: "#fff",
    };
  }

  if (temp <= 38.7) {
    return {
      image: require("../../../assets/chart-orange.png"),
      text: `${temp.toFixed(1)}°C`,
      color: "#fff",
    };
  }

  return {
    image: require("../../../assets/chart-red.png"),
    text: `${temp.toFixed(1)}°C`,
    color: "#fff",
  };
};

export default function FarmScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [farm, setFarm] = useState<FarmItem | null>(null);
  const [headerSource, setHeaderSource] = useState<ImageSourcePropType>(DEFAULT_FARM_IMAGE);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const loadFarm = useCallback(async () => {
    const paramFarm = route.params?.farm ?? null;
    const farmId = paramFarm?.id_fazenda ?? paramFarm?.id ?? null;
    const cached = await cache.getCache('/fazendas');
    const cachedFarms = Array.isArray(cached)
      ? cached
      : Array.isArray(cached?.fazendas)
        ? cached.fazendas
        : Array.isArray(cached?.data)
          ? cached.data
          : [];

    let cachedFarm = farmId
      ? cachedFarms.find((item: FarmItem) => String(item.id_fazenda) === String(farmId))
      : cachedFarms[0];

    if (farmId && (!cachedFarm || !cachedFarm.rua)) {
      try {
        console.log('[FarmScreen] Buscando dados completos da fazenda ID:', farmId);
        const response = await api.get(`/fazendas/${farmId}`);
        const farmDetails = response.data?.fazenda ?? response.data;
        
        if (farmDetails) {
          const updatedFarms = cachedFarms
            .filter((f: any) => String(f.id_fazenda ?? f.id) !== String(farmId))
            .concat([farmDetails]);
          await cache.setCache('/fazendas', updatedFarms);
          cachedFarm = farmDetails;
          console.log('[FarmScreen] Dados completos salvos no cache:', farmDetails);
        }
      } catch (err) {
        console.warn('[FarmScreen] Erro ao buscar dados completos:', err);
      }
    }

    const sourceFarm = cachedFarm ? { ...paramFarm, ...cachedFarm } : paramFarm;
    const nextImage = resolveFarmImage(sourceFarm?.localImageUri ?? sourceFarm?.imagem ?? sourceFarm?.image ?? null);

    let animalsForFarm: any[] = [];
    try {
      if (farmId) {
        const allCacheKey = "/animais";
        const cachedAllAnimalsRaw = await cache.getCache(allCacheKey);
        let allAnimals = Array.isArray(cachedAllAnimalsRaw)
          ? cachedAllAnimalsRaw
          : Array.isArray(cachedAllAnimalsRaw?.animais)
            ? cachedAllAnimalsRaw.animais
            : Array.isArray(cachedAllAnimalsRaw?.data)
              ? cachedAllAnimalsRaw.data
              : [];

        if (!allAnimals || allAnimals.length === 0) {
          try {
            const resp = await api.get('/animais');
            allAnimals = Array.isArray(resp.data) ? resp.data : resp.data?.animais ?? resp.data?.data ?? [];
            if (allAnimals.length > 0) {
              await cache.setCache(allCacheKey, allAnimals);
            }
          } catch (err) {
            console.warn('[FarmScreen] Erro ao buscar animais:', err);
            allAnimals = [];
          }
        }

        animalsForFarm = allAnimals.filter((a: any) => {
          const animalFarmId = String(a.id_fazenda ?? a.fazenda_id ?? a.farm_id ?? '').trim();
          return animalFarmId === String(farmId);
        });
      }
    } catch (e) {
      console.warn('[FarmScreen] Erro ao carregar animais:', e);
      animalsForFarm = [];
    }

    const total = Array.isArray(animalsForFarm) ? animalsForFarm.length : 0;

    const detectGender = (g: any) => {
      const s = String(g ?? '').trim().toLowerCase();
      if (!s) return 'unknown';
      if (s === 'f' || s === 'm') return s === 'f' ? 'female' : 'male';
      if (s.includes('fem') || s.includes('fême') || s.includes('feme') || s.includes('female')) return 'female';
      if (s.includes('mach') || s.includes('male')) return 'male';
      return 'unknown';
    };

    const females = animalsForFarm.filter((a: any) => detectGender(a.genero ?? a.gender) === 'female').length;
    const males = animalsForFarm.filter((a: any) => detectGender(a.genero ?? a.gender) === 'male').length;

    const extractTemp = (a: any) => {
      if (a.medicoes && Array.isArray(a.medicoes) && a.medicoes.length > 0) {
        const sorted = a.medicoes.sort((m1: any, m2: any) => {
          const d1 = new Date(m1.datahora ?? m1.createdAt ?? m1.data ?? 0).getTime();
          const d2 = new Date(m2.datahora ?? m2.createdAt ?? m2.data ?? 0).getTime();
          return d2 - d1; 
        });
        const lastMedicao = sorted[0];
        const temp = toNumber(lastMedicao?.temperatura ?? lastMedicao?.temp ?? lastMedicao?.temperature ?? 0);
        if (temp && Number.isFinite(temp) && temp > 0) return temp;
      }

      const candidates = [
        a.temperatura_media,
        a.averageTemperature,
        a.temp,
        a.temperatura_ultima,
        a.ultima_temperatura,
        a.ultima_medicao?.temperatura,
        a.ultima_medicao?.temp,
        a.lastMeasurement?.temp,
        a.last_measurement?.temp,
        a.temp_media,
        a.temperatura,
      ];
      for (const v of candidates) {
        const n = toNumber(v);
        if (n && Number.isFinite(n) && n > 0) return n;
      }
      return null;
    };

    let allMedicoes: any[] = [];
    try {
      const cachedMedicoes = await cache.getCache('/medicoes');
      if (Array.isArray(cachedMedicoes) && cachedMedicoes.length > 0) {
        allMedicoes = cachedMedicoes;
      } else {
        const resp = await api.get('/medicoes');
        allMedicoes = Array.isArray(resp.data)
          ? resp.data
          : resp.data?.medicoes ?? resp.data?.data ?? [];
        if (allMedicoes.length > 0) {
          await cache.setCache('/medicoes', allMedicoes);
        }
      }
    } catch (err) {
      console.warn('[FarmScreen] Erro ao buscar medições:', err);
    }

    for (const animal of animalsForFarm) {
      const animalId = String(animal.id_animal ?? animal.id ?? '');
      animal.medicoes = allMedicoes.filter(
        (m: any) => String(m.id_animal ?? '') === animalId
      );
    }

    const temps = animalsForFarm
      .map(extractTemp)
      .filter((t: any): t is number => t !== null && t !== undefined);
    const avgTemp = temps.length > 0 ? temps.reduce((s: number, v: number) => s + v, 0) / temps.length : null;

    const merged = { ...sourceFarm, total, females, males, averageTemperature: avgTemp };
    const nextFarm = normalizeFarm(merged);

    setFarm(nextFarm);
    setHeaderSource(nextImage);
  }, [route.params]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await loadFarm();
      })();
      return () => { active = false; };
    }, [loadFarm])
  );

  const handleDeleteFarm = async () => {
    if (!currentFarm?.id_fazenda) return;

    try {
      setLoadingDelete(true);
      const farmId = currentFarm.id_fazenda;
      const currentUser = await auth.getLoggedUser();

      if (!currentUser?.id_usuario) {
        Alert.alert('Erro', 'Você precisa estar autenticado para deletar.');
        return;
      }

      const networkState = await NetInfo.fetch();
      const isConnected = Boolean(networkState.isConnected);

      if (!isConnected) {
        await offlineQueue.enqueue({
          id: `farm_delete_${Date.now()}`,
          endpoint: `/fazendas/${farmId}`,
          method: 'delete',
          fields: { id_usuario: currentUser.id_usuario },
        });

        const cachedAnimalsRaw = await cache.getCache('/animais');
        const cachedAnimals = Array.isArray(cachedAnimalsRaw)
          ? cachedAnimalsRaw
          : Array.isArray(cachedAnimalsRaw?.animais)
            ? cachedAnimalsRaw.animais
            : [];

        const farmAnimals = cachedAnimals.filter((a: any) => String(a.id_fazenda ?? '') === String(farmId));
        for (const animal of farmAnimals) {
          const animalId = animal.id_animal ?? animal.id;
          if (animalId) {
            await offlineQueue.enqueue({
              id: `animal_delete_${animalId}_${Date.now()}`,
              endpoint: `/animais/${animalId}`,
              method: 'delete',
              fields: { id_usuario: currentUser.id_usuario },
            });
          }
        }

        const cachedFarmsRaw = await cache.getCache('/fazendas');
        const cachedFarms = Array.isArray(cachedFarmsRaw)
          ? cachedFarmsRaw
          : Array.isArray(cachedFarmsRaw?.fazendas)
            ? cachedFarmsRaw.fazendas
            : [];
        const updatedFarms = cachedFarms.filter((f: any) => String(f.id_fazenda ?? f.id) !== String(farmId));
        await cache.setCache('/fazendas', updatedFarms);

        Alert.alert('Sucesso', 'Fazenda e animais marcados para deleção. Serão deletados quando a conexão voltar.');
        navigation.goBack();
        return;
      }

      console.log('[Farm] Deletando fazenda', farmId, 'do usuário', currentUser.id_usuario);
      await api.delete(`/fazendas/${farmId}`, { data: { id_usuario: currentUser.id_usuario } });

      const cachedAnimalsRaw = await cache.getCache('/animais');
      const cachedAnimals = Array.isArray(cachedAnimalsRaw)
        ? cachedAnimalsRaw
        : Array.isArray(cachedAnimalsRaw?.animais)
          ? cachedAnimalsRaw.animais
          : [];

      const farmAnimals = cachedAnimals.filter((a: any) => String(a.id_fazenda ?? '') === String(farmId));
      for (const animal of farmAnimals) {
        const animalId = animal.id_animal ?? animal.id;
        if (animalId) {
          try {
            await api.delete(`/animais/${animalId}`, { data: { id_usuario: currentUser.id_usuario } });
          } catch (err) {
            console.warn(`Erro ao deletar animal ${animalId}:`, err);
          }
        }
      }

      const cachedFarmsRaw = await cache.getCache('/fazendas');
      const cachedFarms = Array.isArray(cachedFarmsRaw)
        ? cachedFarmsRaw
        : Array.isArray(cachedFarmsRaw?.fazendas)
          ? cachedFarmsRaw.fazendas
          : [];
      const updatedFarms = cachedFarms.filter((f: any) => String(f.id_fazenda ?? f.id) !== String(farmId));
      await cache.setCache('/fazendas', updatedFarms);

      Alert.alert('Sucesso', 'Fazenda e animais deletados com sucesso.');
      navigation.goBack();
    } catch (err: any) {
      console.error('Erro ao deletar fazenda:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Falha ao deletar fazenda. Tente novamente.';
      Alert.alert('Erro', errorMsg);
    } finally {
      setLoadingDelete(false);
      setShowDeleteModal(false);
    }
  };

  const currentFarm = farm ?? normalizeFarm(route.params?.farm);
  const tempData = getTemperatureData(currentFarm.averageTemperature);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <ImageBackground
          source={headerSource}
          style={styles.headerImage}
          imageStyle={styles.headerImageRadius}
          onError={() => setHeaderSource(DEFAULT_FARM_IMAGE)}
        >
          <View style={styles.overlay} />

          <View style={styles.headerTop}>
            <Text style={styles.title}>{currentFarm.nome_fazenda}</Text>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate("EditFarm", { farm: currentFarm })}
            >
              <Image
                source={require("../../../assets/edit.png")}
                style={styles.editIcon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate("Herd", { farm: currentFarm })}
          >
            <Image
              source={require("../../../assets/cow-light.png")}
              style={styles.manageIcon}
            />
            <Text style={styles.manageText}>Gerenciar rebanho</Text>
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.cardsContainer}>
          <LinearGradient
            colors={["#847E73", "#38381F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.leftCard}
          >
            <Image
              source={require("../../../assets/cow-light.png")}
              style={styles.cowcard}
            />
            <Text style={styles.cardLabelmaior}>
              Quant. {"\n"}total de animais
            </Text>
            <Text style={styles.cardNumbermaior}>{currentFarm.total}</Text>
          </LinearGradient>

          <View style={styles.rightColumn}>
            <LinearGradient
              colors={["#847E73", "#38381F"]}
              style={styles.smallCard}
            >
              <View style={styles.cowcardWrapper}>
                <Image
                  source={require("../../../assets/cow-light.png")}
                  style={styles.cowcardmini}
                />
                <Text style={styles.cardLabel}>Quant. fêmeas</Text>
              </View>
              <Text style={styles.cardNumber}>{currentFarm.females}</Text>
            </LinearGradient>

            <LinearGradient
              colors={["#847E73", "#38381F"]}
              style={styles.smallCard}
            >
              <View style={styles.cowcardWrapper}>
                <Image
                  source={require("../../../assets/cow-light.png")}
                  style={styles.cowcardmini}
                />
                <Text style={styles.cardLabel}>Quant. machos</Text>
              </View>
              <Text style={styles.cardNumber}>{currentFarm.males}</Text>
            </LinearGradient>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate("ReportFarm", { farm: currentFarm })}
        >
          <Image
            source={require("../../../assets/report.png")}
            style={styles.reportIcon}
          />
          <Text style={styles.reportText}>Gerar relatório da fazenda</Text>
        </TouchableOpacity>

        <Text style={styles.subtitle}>Temperatura Média Geral</Text>

        <View style={styles.temperatureContainer}>
          <Image source={tempData.image} style={styles.temperatureIcon} />

          <View style={styles.overlaytext}>
            <Text
              style={[
                styles.temperatureText,
                { color: tempData.color },
              ]}
            >
              {tempData.text}
            </Text>
          </View>
        </View>

        <Text style={styles.legenda}>
          Baseado na medição mais recente de cada animal
        </Text>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setShowDeleteModal(true)}
          disabled={loadingDelete}
        >
          <Text style={styles.deleteButtonText}>Deletar Fazenda</Text>
        </TouchableOpacity>
      </ScrollView>

      <Navbar active="home" />

      {/* DELETE MODAL */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Deleção</Text>
            <Text style={styles.modalMessage}>
              Tem certeza que deseja deletar "{currentFarm.nome_fazenda}"?{"\n\n"}
              Todos os animais dessa fazenda também serão deletados.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDeleteModal(false)}
                disabled={loadingDelete}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonDelete, loadingDelete && { opacity: 0.6 }]}
                onPress={handleDeleteFarm}
                disabled={loadingDelete}
              >
                <Text style={styles.modalButtonDeleteText}>
                  {loadingDelete ? "Deletando..." : "Deletar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}