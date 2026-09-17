import { View, Image, TouchableOpacity, FlatList } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import React from "react";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getFazendas } from "../../storage/repository";
import { runSync } from "../../services/syncManager";

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
};

const FALLBACK_IMAGE = require("../../../assets/farm1.png");
const API_URL = "https://infracow-api-hv24.onrender.com";

const getImageUrl = (imagePath?: string | null) => {
  if (!imagePath) return FALLBACK_IMAGE;
  const normalized = String(imagePath).trim();
  if (!normalized || normalized === "null" || normalized === "undefined") return FALLBACK_IMAGE;
  // file:/blob:/data: = imagem salva no próprio celular (cadastro offline ou
  // já sincronizado). http(s) = veio do servidor.
  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) {
    return { uri: normalized };
  }
  const cleanPath = normalized.replace(/^\/+/, "");
  const fullPath = cleanPath.startsWith("uploads/") ? cleanPath : `uploads/${cleanPath}`;
  return { uri: `${API_URL}/${fullPath}` };
};

/**
 * A foto guardada no aparelho tem prioridade sobre o caminho do servidor:
 * ela aparece na hora, com ou sem internet. Só cai pro caminho remoto quando
 * a fazenda veio do servidor e nunca teve foto local nesse celular.
 */
const resolveFarmImage = (farm: FarmItem) => getImageUrl(farm.localImageUri ?? farm.imagem ?? null);

const formatAddress = (farm: FarmItem) => {
  const parts = [farm.rua, farm.bairro].filter(Boolean).join(", ");
  const city = farm.cidade?.trim();
  if (parts && city) return `${parts} - ${city}`;
  return parts || city || "Endereço não informado";
};

export default function HomeScreen() {
  const [farms, setFarms] = useState<FarmItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const loadFromLocal = () => {
    try {
      setFarms(getFazendas());
    } catch (error) {
      console.error("[Home] Erro ao ler fazendas locais:", error);
    }
  };

  const syncAndReload = async () => {
    loadFromLocal();
    setRefreshing(true);
    try {
      await runSync();
    } catch (error) {
      console.error("[Home] Erro ao sincronizar:", error);
    } finally {
      loadFromLocal();
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      syncAndReload();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bem-vindo ao{"\n"}Infracow</Text>
        <Image source={require("../../../assets/logoescura 1.png")} style={styles.logo} />
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("RegisterFarm")}>
        <Image source={require("../../../assets/plus.png")} style={styles.plus} />
        <Text style={styles.buttonText}>Cadastrar nova Fazenda</Text>
      </TouchableOpacity>

      <FlatList
        data={farms}
        keyExtractor={(item) => String(item.id_fazenda)}
        contentContainerStyle={{ paddingBottom: 100 }}
        onRefresh={syncAndReload}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={{ paddingVertical: 28, alignItems: "center" }}>
            <Text style={styles.cardText}>Você ainda não cadastrou fazendas.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={resolveFarmImage(item)} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.nome_fazenda}</Text>
              <Text style={styles.cardText}>{formatAddress(item)}</Text>
              <Text style={styles.cardCity}>{item.CEP ? `CEP ${item.CEP}` : " "}</Text>
              <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate("Farm", { farm: item })}>
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
