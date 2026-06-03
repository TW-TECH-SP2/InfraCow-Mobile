import {
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ImageSourcePropType,
} from "react-native";
import Text from "../../components/Text";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import api from "../../services/api";
import cache from "../../services/cache";
import Constants from "expo-constants";

type FarmLike = {
  id_fazenda?: number | string;
  id?: number | string;
  nome_fazenda?: string;
  name?: string;
  imagem?: string | null;
  image?: string | null;
  localImageUri?: string | null;
  pendingSync?: boolean;
  clientTempId?: string | null;
};

type HerdAnimal = {
  id_animal?: number | string;
  id?: number | string;
  nome_animal?: string;
  nome?: string;
  codigo?: string | null;
  genero?: string | null;
  tipo?: string | null;
  raca?: string | null;
  imagem?: string | null;
  image?: string | null;
  localImageUri?: string | null;
  id_fazenda?: number | string | null;
  pendingSync?: boolean;
  clientTempId?: string | null;
};

const DEFAULT_FARM_IMAGE = require("../../../assets/farm1.png");
const DEFAULT_ANIMAL_IMAGE_FEMALE = require("../../../assets/cow1.png");
const DEFAULT_ANIMAL_IMAGE_MALE = require("../../../assets/cow4.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (image?: string | null, fallback: ImageSourcePropType = DEFAULT_ANIMAL_IMAGE_FEMALE): ImageSourcePropType => {
  if (!image) return fallback;

  const normalized = String(image).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return fallback;
  }

  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) {
    return { uri: normalized };
  }

  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  return { uri: `${baseUrl}/${path}` };
};

const normalizeText = (value?: string | null) => String(value ?? "").trim().toLowerCase();

const normalizeAnimal = (animal: HerdAnimal) => {
  const genre = normalizeText(animal.genero);
  const isFemale = genre.includes("fême") || genre.includes("feme") || genre.includes("female") || genre === "f";
  const isMale = genre.includes("mach") || genre.includes("male") || genre === "m";

  return {
    id: String(animal.id_animal ?? animal.id ?? animal.nome_animal ?? animal.nome ?? Date.now()),
    name: animal.nome_animal ?? animal.nome ?? "Animal",
    code: animal.codigo ?? "",
    genre: animal.genero ?? "",
    type: animal.tipo ?? "",
    breed: animal.raca ?? "",
    image: animal.localImageUri ?? animal.imagem ?? animal.image ?? null,
    id_fazenda: animal.id_fazenda ?? null,
    raw: animal,
    isFemale,
    isMale,
  };
};

const extractAnimals = (payload: any): HerdAnimal[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.animais)) return payload.animais;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const mergeCachedLocalImages = (freshAnimals: HerdAnimal[], cachedAnimals: HerdAnimal[]) => {
  return freshAnimals.map((animal) => {
    const cachedAnimal = cachedAnimals.find(
      (item) => String(item.id_animal ?? item.clientTempId ?? '') === String(animal.id_animal)
    );

    return {
      ...cachedAnimal,
      ...animal,
      localImageUri: cachedAnimal?.localImageUri ?? animal.localImageUri ?? null,
      pendingSync: cachedAnimal?.pendingSync ?? animal.pendingSync ?? false,
      clientTempId: cachedAnimal?.clientTempId ?? animal.clientTempId ?? null,
    };
  });
};

export default function HerdScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [animals, setAnimals] = useState<HerdAnimal[]>([]);
  const [headerFarm, setHeaderFarm] = useState<FarmLike | null>(null);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [headerImageSource, setHeaderImageSource] = useState<ImageSourcePropType>(DEFAULT_FARM_IMAGE);

  const farmFromRoute: FarmLike | null = route.params?.farm ?? null;
  const farmId = farmFromRoute?.id_fazenda ?? farmFromRoute?.id ?? null;

  const loadAnimals = useCallback(async () => {
    let mounted = true;
    try {
      setLoadingAnimals(true);

      const cachedFarmsRaw = await cache.getCache("/fazendas");
      const cachedFarms = extractAnimals(cachedFarmsRaw) as FarmLike[];
      const cachedFarm = farmId
        ? cachedFarms.find((item) => String(item.id_fazenda ?? item.id) === String(farmId))
        : null;

      if (mounted) {
        setHeaderFarm(cachedFarm ?? farmFromRoute);
      }

      const cacheKey = "/animais";
      const cachedAnimalsRaw = await cache.getCache(cacheKey);
      const cachedAnimals = extractAnimals(cachedAnimalsRaw);

      if (cachedAnimals.length > 0 && mounted) {
        const cachedFilteredByFarm = farmId
          ? cachedAnimals.filter((animal) => String(animal.id_fazenda ?? "") === String(farmId))
          : cachedAnimals;
        setAnimals(cachedFilteredByFarm);
      }

      try {
        const response = await api.get("/animais");
        const freshAnimals = extractAnimals(response.data);
        const pendingAnimals = cachedAnimals.filter((animal) => animal.pendingSync === true);
        const serverIds = new Set(freshAnimals.map((animal) => String(animal.id_animal ?? animal.id)));
        const trulyPending = pendingAnimals.filter(
          (animal) => !serverIds.has(String(animal.id_animal)) && !serverIds.has(String(animal.clientTempId))
        );

        const merged = mergeCachedLocalImages(freshAnimals, cachedAnimals);
        const finalAnimals = [...merged, ...trulyPending];
        const filteredByFarm = farmId
          ? finalAnimals.filter((animal) => String(animal.id_fazenda ?? "") === String(farmId))
          : finalAnimals;

        await cache.setCache(cacheKey, finalAnimals);

        if (mounted) {
          setAnimals(filteredByFarm);
        }
      } catch (err) {
        console.warn('[Herd] Erro ao buscar animais:', err);
        if (cachedAnimals.length === 0 && mounted) {
          setAnimals([]);
        }
      }
    } finally {
      setLoadingAnimals(false);
    }
  }, [farmId, farmFromRoute]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        if (!isActive) return;
        await loadAnimals();
      })();

      return () => {
        isActive = false;
      };
    }, [loadAnimals])
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAnimals = useMemo(() => {
    const mapped = animals.map(normalizeAnimal);

    if (!normalizedSearch) {
      return mapped;
    }

    return mapped.filter((animal) => {
      const searchable = [animal.name, animal.code, animal.breed, animal.type, animal.genre]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      return searchable.includes(normalizedSearch);
    });
  }, [animals, normalizedSearch]);

  const filteredFemaleAnimals = filteredAnimals.filter((animal) => animal.isFemale);
  const filteredMaleAnimals = filteredAnimals.filter((animal) => animal.isMale);
  const filteredUnclassifiedAnimals = filteredAnimals.filter((animal) => !animal.isFemale && !animal.isMale);

  const renderCard = (item: ReturnType<typeof normalizeAnimal>) => {
    const fallbackImage = item.isMale ? DEFAULT_ANIMAL_IMAGE_MALE : DEFAULT_ANIMAL_IMAGE_FEMALE;
    return (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => navigation.navigate("Animal", { animal: item.raw })}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={resolveImage(item.image, fallbackImage)}
        style={styles.cardImage}
        imageStyle={{ borderRadius: 20 }}
      >
        <Text style={styles.cardTitle}>{item.name}</Text>

        <TouchableOpacity
          style={styles.dotsButton}
          onPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
        >
          <Image
            source={require("../../../assets/dots.png")}
            style={styles.dotsIcon}
          />
        </TouchableOpacity>

        {openMenuId === item.id && (
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => {
                setOpenMenuId(null);
                navigation.navigate("EditAnimal", { animal: item.raw });
              }}
            >
              <Image
                source={require("../../../assets/edit-green.png")}
                style={styles.menuIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuBtn}>
              <Image
                source={require("../../../assets/delete.png")}
                style={styles.menuIcon}
              />
            </TouchableOpacity>
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
    );
  };

  const headerImage = headerFarm?.localImageUri ?? headerFarm?.imagem ?? headerFarm?.image ?? null;

  useEffect(() => {
    setHeaderImageSource(resolveImage(headerImage, DEFAULT_FARM_IMAGE));
  }, [headerImage]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <ImageBackground
          source={headerImageSource}
          style={styles.headerImage}
          imageStyle={styles.headerImageRadius}
          onError={() => setHeaderImageSource(DEFAULT_FARM_IMAGE)}
        >
          <View style={styles.overlay} />
          <TouchableOpacity onPress={() => navigation.navigate("Farm", { farm: farmFromRoute })}>
            <Image
              source={require("../../../assets/back-dark.png")}
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <Text style={styles.title}>{headerFarm?.nome_fazenda ?? headerFarm?.name ?? "Rebanho"}</Text>

          <View style={styles.actionsRow}>
            <View style={[styles.search, isSearching && styles.searchActive]}>
              <Image
                source={require("../../../assets/search.png")}
                style={styles.searchIcon}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                placeholder="Buscar bovino..."
                placeholderTextColor="#C3C3C3"
                underlineColorAndroid="transparent"
                onFocus={() => setIsSearching(true)}
                onBlur={() => setIsSearching(false)}
              />
            </View>

            {!isSearching && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("RegisterAnimal", { farm: farmFromRoute })}
              >
                <Image
                  source={require("../../../assets/plus.png")}
                  style={styles.addIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>

        <Text style={styles.sectionTitle}>Fêmeas</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {loadingAnimals ? (
            <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>
              Carregando animais...
            </Text>
          ) : filteredFemaleAnimals.length > 0 ? (
            filteredFemaleAnimals.map(renderCard)
          ) : (
            <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>
              Nenhuma fêmea encontrada.
            </Text>
          )}
        </ScrollView>

        <Text style={styles.sectionTitle}>Machos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {loadingAnimals ? (
            <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>
              Carregando animais...
            </Text>
          ) : filteredMaleAnimals.length > 0 ? (
            filteredMaleAnimals.map(renderCard)
          ) : (
            <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>
              Nenhum macho encontrado.
            </Text>
          )}
        </ScrollView>

        {!loadingAnimals && filteredUnclassifiedAnimals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sem classificação</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {filteredUnclassifiedAnimals.map(renderCard)}
            </ScrollView>
          </>
        )}
      </ScrollView>

      <Navbar active="home" />
    </View>
  );
}