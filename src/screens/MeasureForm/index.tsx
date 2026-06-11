import { View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
import Text from "../../components/Text";
import { useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Navbar from "../../components/Navbar";
import styles from "./styles";
import Constants from "expo-constants";
import api from "../../services/api";

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
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") return DEFAULT_FARM_IMAGE;
  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) return { uri: normalized };
  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  return { uri: `${getApiBaseUrl().replace(/\/$/, "")}/${path}` };
};

export default function MeasureForm() {
  const [open, setOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmItem | null>(null);
  const [farms, setFarms] = useState<FarmItem[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const navigation = useNavigation<any>();
  const autoRedirectedRef = useRef(false);

  useEffect(() => {
    const loadFarms = async () => {
      setLoadingFarms(true);
      try {
        const res = await api.get('/fazendas');
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.fazendas) ? res.data.fazendas : [];
        setFarms(list);
      } catch (error: any) {
        Alert.alert("Erro", "Não foi possível carregar as fazendas. Verifique sua conexão.");
      } finally {
        setLoadingFarms(false);
      }
    };
    loadFarms();
  }, []);

  useEffect(() => {
    if (loadingFarms || autoRedirectedRef.current) return;
    if (farms.length === 1) {
      autoRedirectedRef.current = true;
      const onlyFarm = farms[0];
      setSelectedFarm(onlyFarm);
      navigation.replace("MeasureSelectAnimal", { farm: onlyFarm });
    }
  }, [farms, loadingFarms, navigation]);

  const handleSelect = (farm: any) => {
    setSelectedFarm(farm);
    setOpen(false);
  };

  const handleNext = () => {
    if (!selectedFarm) return;
    navigation.navigate("MeasureSelectAnimal", { farm: selectedFarm });
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Medir</Text>
            <Text style={styles.title}>Temperatura</Text>
          </View>
          <Image source={require("../../../assets/logoescura 1.png")} style={styles.logo} />
        </View>

        <Text style={styles.subtitle}>Preencha o formulário seguindo as etapas:</Text>

        {loadingFarms ? (
          <View style={{ paddingVertical: 28 }}>
            <ActivityIndicator size="large" color="#6b6b40" />
          </View>
        ) : farms.length === 0 ? (
          <Text style={styles.subtitle}>Nenhuma fazenda cadastrada ainda.</Text>
        ) : (
          <>
            <View style={styles.selectWrapper}>
              <TouchableOpacity style={[styles.select, open && styles.selectOpen]} onPress={() => setOpen(!open)}>
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
                <Image source={require("../../../assets/arrow-down.png")} style={styles.arrowselect} />
              </TouchableOpacity>

              {open && (
                <View style={styles.dropdown}>
                  {farms.map((item) => (
                    <TouchableOpacity key={String(item.id_fazenda ?? item.id)} style={styles.option} onPress={() => handleSelect(item)}>
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

            <TouchableOpacity style={[styles.button, !selectedFarm && { opacity: 0.5 }]} onPress={handleNext} disabled={!selectedFarm}>
              <Text style={styles.buttonText}>Próxima Etapa</Text>
            </TouchableOpacity>
          </>
        )}

        <Navbar active="measure" />
      </View>
    </ScrollView>
  );
}
