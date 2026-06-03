import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ImageBackground
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import styles from "./styles";
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
  imagem?: string | null;
  image?: string | null;
  localImageUri?: string | null;
  id_fazenda?: number | string | null;
};

const DEFAULT_ANIMAL_IMAGE_FEMALE = require("../../../assets/cow1.png");
const DEFAULT_ANIMAL_IMAGE_MALE = require("../../../assets/cow4.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (image?: string | null, fallback = DEFAULT_ANIMAL_IMAGE_FEMALE) => {
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

const normalizeAnimal = (animal: AnimalLike) => {
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

const extractAnimals = (payload: any): AnimalLike[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.animais)) return payload.animais;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function MeasureSelectAnimal() {
  const route = useRoute<any>();
  const farm: FarmLike | null = route.params?.farm ?? null;
  const farmId = farm?.id_fazenda ?? farm?.id ?? null;
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [animals, setAnimals] = useState<AnimalLike[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    let mounted = true;

    const loadAnimals = async () => {
      try {
        setLoadingAnimals(true);

        const cacheKey = "/animais";
        const cachedAnimalsRaw = await cache.getCache(cacheKey);
        const cachedAnimals = extractAnimals(cachedAnimalsRaw);

        // Filtra apenas animais da fazenda se farmId foi fornecido
        const filteredAnimals = farmId
          ? cachedAnimals.filter((a: any) => String(a.id_fazenda ?? '') === String(farmId))
          : cachedAnimals;

        if (filteredAnimals.length > 0 && mounted) {
          setAnimals(filteredAnimals);
        }

        // Sempre busca versão fresca da API
        try {
          const response = await api.get('/animais');
          const allAnimals = extractAnimals(response.data);
          
          // Filtra apenas animais da fazenda se farmId foi fornecido
          const farmAnimals = farmId
            ? allAnimals.filter((a: any) => String(a.id_fazenda ?? '') === String(farmId))
            : allAnimals;

          if (mounted) {
            setAnimals(farmAnimals);
          }

          await cache.setCache(cacheKey, allAnimals);
          return;
        } catch (error) {
          console.warn("[MeasureSelectAnimal] Falha ao carregar animais", error);
        }

        if (filteredAnimals.length === 0) {
          try {
            const response = await api.get("/animais");
            const allAnimals = extractAnimals(response.data);
            const filtered = farmId
              ? allAnimals.filter((animal) => String(animal.id_fazenda ?? "") === String(farmId))
              : allAnimals;

            if (mounted) {
              setAnimals(filtered);
            }

            await cache.setCache(cacheKey, filtered);
          } catch (error) {
            console.warn("[MeasureSelectAnimal] Falha ao carregar animais gerais", error);
          }
        }
      } finally {
        if (mounted) {
          setLoadingAnimals(false);
        }
      }
    };

    loadAnimals();

    return () => {
      mounted = false;
    };
  }, [farmId]);

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

  const filteredFemales = filteredAnimals.filter(animal => animal.isFemale);
  const filteredMales = filteredAnimals.filter(animal => animal.isMale);
  const filteredUnclassifiedAnimals = filteredAnimals.filter(animal => !animal.isFemale && !animal.isMale);

  const renderCard = (item: ReturnType<typeof normalizeAnimal>) => {
    const fallbackImage = item.isMale ? DEFAULT_ANIMAL_IMAGE_MALE : DEFAULT_ANIMAL_IMAGE_FEMALE;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => setSelectedAnimal(item)}
      >
        <ImageBackground
          source={resolveImage(item.image, fallbackImage)}
          style={styles.cardImage}
          imageStyle={{ borderRadius: 20 }}
        >
          <Text style={styles.cardTitle}>{item.name}</Text>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  const handleNext = () => {
    if (!selectedAnimal) return;

    navigation.navigate("Position", {
      farm,
      animal: selectedAnimal.raw,
    });
  };

  return (
    <View style={styles.container}>

      

      <ScrollView showsVerticalScrollIndicator={false}>

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
        {farm?.nome_fazenda ? `Selecione um animal de ${farm.nome_fazenda}` : "Selecione um animal"}
      </Text>

      {/* RFID */}
      <View style={styles.rfidsection}>
        <View style={styles.esquerda}>
          <Text style={styles.rfidTextverde}>Quer ser mais rápido? <Text style={styles.rfidTextresto}> Vá pela leitura do brinco do animal!</Text></Text>
        </View>
        <View style={styles.direita}>
          
            <TouchableOpacity style={styles.rfidButton}
            onPress={() => navigation.navigate("PositionRfid", { farm })} >
              <Image
                      source={require("../../../assets/rfidbutton.png")} 
                      style={styles.rfidimg}
                    />
                    <Text style={styles.rfidButtonText}>Ler Brinco</Text></TouchableOpacity>
          </View>
      </View>


      {/* SEARCH */}
      <View style={styles.search}>
        <Image
          source={require("../../../assets/search.png")}
          style={styles.searchIcon}
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          underlineColorAndroid="transparent"
          selectionColor="#000"
        />
      </View>

      {loadingAnimals ? (
        <View style={{ paddingVertical: 28 }}>
          <Text style={{ textAlign: "center" }}>Carregando animais...</Text>
        </View>
      ) : filteredAnimals.length === 0 ? (
        <View style={{ paddingVertical: 28 }}>
          <Text style={{ textAlign: "center" }}>Nenhum animal encontrado para essa fazenda.</Text>
        </View>
      ) : null}

        {/* FÊMEAS */}
        <Text style={styles.sectionTitle}>Fêmeas</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredFemales.map(renderCard)}
        </ScrollView>

        {/* MACHOS */}
        <Text style={styles.sectionTitle}>Machos</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredMales.map(renderCard)}
        </ScrollView>

        {filteredUnclassifiedAnimals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Outros</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filteredUnclassifiedAnimals.map(renderCard)}
            </ScrollView>
          </>
        )}

        {/* BOTÃO */}
      <TouchableOpacity
        style={[
          styles.button,
          !selectedAnimal && { opacity: 0.5 }
        ]}
        disabled={!selectedAnimal}
        onPress={handleNext}
      >
        <Text style={styles.buttonText}>Próxima Etapa</Text>
      </TouchableOpacity>

      </ScrollView>

      

      {/* NAVBAR */}
      <Navbar active="measure" />

    </View>
  );
}