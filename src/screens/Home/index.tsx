import { View, Image, TouchableOpacity, FlatList } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import React from "react";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";

type FarmItem = {
  id_fazenda: number;
  nome_fazenda: string;
  rua?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  CEP?: string | null;
  numero?: string | number | null;
  imagem?: string | null;
};

const FALLBACK_IMAGE = require("../../../assets/farm1.png");
const API_URL = "https://infracow-api-hv24.onrender.com";

const getImageUrl = (imagePath?: string | null) => {
  if (!imagePath) return FALLBACK_IMAGE;
  if (imagePath.startsWith("http")) return { uri: imagePath };
  const cleanPath = imagePath.replace(/^\/+/, "");
  const fullPath = cleanPath.startsWith("uploads/") ? cleanPath : `uploads/${cleanPath}`;
  return { uri: `${API_URL}/${fullPath}` };
};

const formatAddress = (farm: FarmItem) => {
  const parts = [farm.rua, farm.bairro].filter(Boolean).join(", ");
  const city = farm.cidade?.trim();
  if (parts && city) return `${parts} - ${city}`;
  return parts || city || "Endereço não informado";
};

export default function HomeScreen() {
  const [farms, setFarms] = useState<FarmItem[]>([]);
  const navigation = useNavigation<any>();

  const loadFarms = async () => {
    try {
      const response = await api.get("/fazendas");
      const list = response.data?.fazendas || response.data || [];
      console.log("[Home] API retornou:", list.length, "fazendas");
      setFarms(list);
    } catch (error) {
      console.error("[Home] Erro ao carregar fazendas:", error);
      setFarms([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadFarms();
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
        onRefresh={loadFarms}
        refreshing={false}
        ListEmptyComponent={
          <View style={{ paddingVertical: 28, alignItems: "center" }}>
            <Text style={styles.cardText}>Você ainda não cadastrou fazendas.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={getImageUrl(item.imagem)} style={styles.cardImage} />
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