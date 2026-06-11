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
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import api from "../../services/api";
import Constants from "expo-constants";

const DEFAULT_FARM_IMAGE = require("../../../assets/farm1.png");
const DEFAULT_ANIMAL_IMAGE_FEMALE = require("../../../assets/cow1.png");
const DEFAULT_ANIMAL_IMAGE_MALE = require("../../../assets/cow4.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (image?: string | null, fallback: ImageSourcePropType = DEFAULT_ANIMAL_IMAGE_FEMALE): ImageSourcePropType => {
  if (!image) return fallback;
  const n = String(image).trim();
  if (!n || n === 'null' || n === 'undefined') return fallback;
  if (/^https?:\/\//i.test(n) || /^(file:|blob:|data:)/i.test(n)) return { uri: n };
  const clean = n.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  return { uri: `${getApiBaseUrl().replace(/\/$/, "")}/${path}` };
};

const normalizeText = (value?: string | null) => String(value ?? "").trim().toLowerCase();

const normalizeAnimal = (animal: any) => {
  const genre = normalizeText(animal.genero);
  const isFemale = genre.includes("fême") || genre.includes("feme") || genre.includes("female") || genre === "f";
  const isMale = genre.includes("mach") || genre.includes("male") || genre === "m";
  return {
    id: String(animal.id_animal ?? animal.id ?? Date.now()),
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

export default function HerdScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [headerFarm, setHeaderFarm] = useState<any>(null);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [headerImageSource, setHeaderImageSource] = useState<ImageSourcePropType>(DEFAULT_FARM_IMAGE);
  const [deletingAnimalId, setDeletingAnimalId] = useState<string | null>(null);

  const farmFromRoute = route.params?.farm ?? null;
  const farmIdValue = farmFromRoute?.id_fazenda ?? farmFromRoute?.id ?? null;
  const farmId = farmIdValue !== null && farmIdValue !== undefined && String(farmIdValue).trim() !== ''
    ? String(farmIdValue)
    : '';

  const loadAnimals = useCallback(async () => {
    setLoadingAnimals(true);
    try {
      const farmsResp = await api.get('/fazendas');
      const farms = Array.isArray(farmsResp.data) ? farmsResp.data : Array.isArray(farmsResp.data?.fazendas) ? farmsResp.data.fazendas : [];
      const displayFarm = farmId ? farms.find((f: any) => String(f.id_fazenda ?? f.id ?? '') === farmId) ?? farmFromRoute : farmFromRoute;
      setHeaderFarm(displayFarm);
      setHeaderImageSource(resolveImage(displayFarm?.imagem ?? null, DEFAULT_FARM_IMAGE));

      const animalsResp = await api.get('/animais');
      const allAnimals = Array.isArray(animalsResp.data) ? animalsResp.data : Array.isArray(animalsResp.data?.animais) ? animalsResp.data.animais : [];
      const filtered = farmId
        ? allAnimals.filter((a: any) => String(a.id_fazenda ?? a.fazenda_id ?? '') === farmId)
        : allAnimals;

      console.log('[Herd] farmId:', farmId, '| animais encontrados:', filtered.length);
      setAnimals(filtered);
    } catch (err) {
      console.error('[Herd] Erro ao carregar:', err);
    } finally {
      setLoadingAnimals(false);
    }
  }, [farmId]);

  const deleteAnimal = useCallback(async (animal: any) => {
    const animalId = String(animal?.id_animal ?? animal?.id ?? '');
    if (!animalId) return;

    try {
      setDeletingAnimalId(animalId);
      setAnimals((prev) => prev.filter((a) => String(a.id_animal ?? a.id) !== animalId));
      await api.delete(`/animais/${animalId}`);
      setOpenMenuId(null);
    } catch (err) {
      console.warn('[Herd] delete animal error:', err);
      loadAnimals();
    } finally {
      setDeletingAnimalId(null);
    }
  }, [loadAnimals]);

  useFocusEffect(
    useCallback(() => {
      loadAnimals();
    }, [loadAnimals])
  );

  const normalizedSearch = search.trim().toLowerCase();

  const filteredAnimals = useMemo(() => {
    const mapped = animals.map(normalizeAnimal);
    if (!normalizedSearch) return mapped;
    return mapped.filter((animal) => {
      const searchable = [animal.name, animal.code, animal.breed, animal.type, animal.genre]
        .filter(Boolean).map((v) => String(v).toLowerCase()).join(" ");
      return searchable.includes(normalizedSearch);
    });
  }, [animals, normalizedSearch]);

  const filteredFemaleAnimals = filteredAnimals.filter((a) => a.isFemale);
  const filteredMaleAnimals = filteredAnimals.filter((a) => a.isMale);
  const filteredUnclassifiedAnimals = filteredAnimals.filter((a) => !a.isFemale && !a.isMale);

  const currentFarm = headerFarm ?? farmFromRoute;

  const renderCard = (item: ReturnType<typeof normalizeAnimal>) => {
    const fallbackImage = item.isMale ? DEFAULT_ANIMAL_IMAGE_MALE : DEFAULT_ANIMAL_IMAGE_FEMALE;
    const animalId = String(item.raw?.id_animal ?? item.raw?.id ?? item.id);
    return (
      <TouchableOpacity key={item.id} style={styles.card} onPress={() => navigation.navigate("Animal", { animal: item.raw })} activeOpacity={0.9}>
        <ImageBackground source={resolveImage(item.image, fallbackImage)} style={styles.cardImage} imageStyle={{ borderRadius: 20 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <TouchableOpacity style={styles.dotsButton} onPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
            <Image source={require("../../../assets/dots.png")} style={styles.dotsIcon} />
          </TouchableOpacity>
          {openMenuId === item.id && (
            <View style={styles.menu}>
              <TouchableOpacity style={styles.menuBtn} onPress={() => { setOpenMenuId(null); navigation.navigate("EditAnimal", { animal: item.raw }); }}>
                <Image source={require("../../../assets/edit-green.png")} style={styles.menuIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => deleteAnimal(item.raw)} disabled={deletingAnimalId === animalId}>
                <Image source={require("../../../assets/delete.png")} style={styles.menuIcon} />
              </TouchableOpacity>
            </View>
          )}
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <ImageBackground source={headerImageSource} style={styles.headerImage} imageStyle={styles.headerImageRadius} onError={() => setHeaderImageSource(DEFAULT_FARM_IMAGE)}>
          <View style={styles.overlay} />
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image source={require("../../../assets/back-dark.png")} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.title}>{currentFarm?.nome_fazenda ?? currentFarm?.name ?? "Rebanho"}</Text>
          <View style={styles.actionsRow}>
            <View style={[styles.search, isSearching && styles.searchActive]}>
              <Image source={require("../../../assets/search.png")} style={styles.searchIcon} />
              <TextInput value={search} onChangeText={setSearch} style={styles.searchInput} placeholder="Buscar bovino..." placeholderTextColor="#C3C3C3" underlineColorAndroid="transparent" onFocus={() => setIsSearching(true)} onBlur={() => setIsSearching(false)} />
            </View>
            {!isSearching && (
              <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("RegisterAnimal", { farm: currentFarm })}>
                <Image source={require("../../../assets/plus.png")} style={styles.addIcon} />
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>

        <Text style={styles.sectionTitle}>Fêmeas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {loadingAnimals
            ? <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>Carregando...</Text>
            : filteredFemaleAnimals.length > 0
              ? filteredFemaleAnimals.map(renderCard)
              : <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>Nenhuma fêmea cadastrada.</Text>}
        </ScrollView>

        <Text style={styles.sectionTitle}>Machos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {loadingAnimals
            ? <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>Carregando...</Text>
            : filteredMaleAnimals.length > 0
              ? filteredMaleAnimals.map(renderCard)
              : <Text style={{ color: '#fff', paddingHorizontal: 20, paddingVertical: 10 }}>Nenhum macho cadastrado.</Text>}
        </ScrollView>

        {!loadingAnimals && filteredUnclassifiedAnimals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sem classificação</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {filteredUnclassifiedAnimals.map(renderCard)}
            </ScrollView>
          </>
        )}
      </ScrollView>

      <Navbar active="home" />
    </View>
  );
}
