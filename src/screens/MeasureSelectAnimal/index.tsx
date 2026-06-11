import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ImageBackground,
  Alert
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import styles from "./styles";
import api from "../../services/api";
import Constants from "expo-constants";

const DEFAULT_ANIMAL_IMAGE_FEMALE = require("../../../assets/cow1.png");
const DEFAULT_ANIMAL_IMAGE_MALE = require("../../../assets/cow4.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (image?: string | null, fallback = DEFAULT_ANIMAL_IMAGE_FEMALE) => {
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

export default function MeasureSelectAnimal() {
  const route = useRoute<any>();
  const farm = route.params?.farm ?? null;
  const farmIdValue = farm?.id_fazenda ?? farm?.id ?? null;
  const farmId = farmIdValue !== null && farmIdValue !== undefined && String(farmIdValue).trim() !== ''
    ? String(farmIdValue)
    : '';

  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [animals, setAnimals] = useState<any[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const navigation = useNavigation<any>();

  const loadAnimals = useCallback(async () => {
    setLoadingAnimals(true);
    try {
      const res = await api.get('/animais');
      const all = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.animais) ? res.data.animais : [];
      const filtered = farmId
        ? all.filter((a: any) => String(a.id_fazenda ?? '') === farmId)
        : all;
      console.log('[MeasureSelectAnimal] farmId:', farmId, '| animais:', filtered.length);
      setAnimals(filtered);
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível carregar os animais. Verifique sua conexão.");
    } finally {
      setLoadingAnimals(false);
    }
  }, [farmId]);

  useFocusEffect(useCallback(() => {
    loadAnimals();
  }, [loadAnimals]));

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

  const filteredFemales = filteredAnimals.filter(a => a.isFemale);
  const filteredMales = filteredAnimals.filter(a => a.isMale);
  const filteredUnclassified = filteredAnimals.filter(a => !a.isFemale && !a.isMale);

  const renderCard = (item: ReturnType<typeof normalizeAnimal>) => {
    const fallbackImage = item.isMale ? DEFAULT_ANIMAL_IMAGE_MALE : DEFAULT_ANIMAL_IMAGE_FEMALE;
    const isSelected = selectedAnimal?.id === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, isSelected && { borderWidth: 3, borderColor: '#4CAF50', borderRadius: 20 }]}
        onPress={() => setSelectedAnimal(item)}
      >
        <ImageBackground source={resolveImage(item.image, fallbackImage)} style={styles.cardImage} imageStyle={{ borderRadius: 20 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  const handleNext = () => {
    if (!selectedAnimal) return;
    navigation.navigate("Position", { farm, animal: selectedAnimal.raw });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Medir</Text>
            <Text style={styles.title}>Temperatura</Text>
          </View>
          <Image source={require("../../../assets/logoescura 1.png")} style={styles.logo} />
        </View>

        <Text style={styles.subtitle}>
          {farm?.nome_fazenda ? `Selecione um animal de ${farm.nome_fazenda}` : "Selecione um animal"}
        </Text>

        <View style={styles.rfidsection}>
          <View style={styles.esquerda}>
            <Text style={styles.rfidTextverde}>Quer ser mais rápido? <Text style={styles.rfidTextresto}> Vá pela leitura do brinco do animal!</Text></Text>
          </View>
          <View style={styles.direita}>
            <TouchableOpacity style={styles.rfidButton} onPress={() => navigation.navigate("PositionRfid", { farm })}>
              <Image source={require("../../../assets/rfidbutton.png")} style={styles.rfidimg} />
              <Text style={styles.rfidButtonText}>Ler Brinco</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.search}>
          <Image source={require("../../../assets/search.png")} style={styles.searchIcon} />
          <TextInput value={search} onChangeText={setSearch} style={styles.searchInput} underlineColorAndroid="transparent" selectionColor="#000" />
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

        <Text style={styles.sectionTitle}>Fêmeas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredFemales.map(renderCard)}
        </ScrollView>

        <Text style={styles.sectionTitle}>Machos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredMales.map(renderCard)}
        </ScrollView>

        {filteredUnclassified.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Outros</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filteredUnclassified.map(renderCard)}
            </ScrollView>
          </>
        )}

        <TouchableOpacity style={[styles.button, !selectedAnimal && { opacity: 0.5 }]} disabled={!selectedAnimal} onPress={handleNext}>
          <Text style={styles.buttonText}>Próxima Etapa</Text>
        </TouchableOpacity>
      </ScrollView>

      <Navbar active="measure" />
    </View>
  );
}
