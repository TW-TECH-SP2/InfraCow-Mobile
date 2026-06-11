import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View, Text, ImageBackground, TouchableOpacity, Image,
  ScrollView, ImageSourcePropType, Modal, Alert,
} from "react-native";
import styles from "./styles";
import { LinearGradient } from "expo-linear-gradient";
import Navbar from "../../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../services/api";

const DEFAULT_FARM_IMAGE = require("../../../assets/farm1.png");
const API_URL = "https://infracow-api-hv24.onrender.com";

const getImageUrl = (imagePath?: string | null): ImageSourcePropType => {
  if (!imagePath) return DEFAULT_FARM_IMAGE;
  if (imagePath.startsWith("http")) return { uri: imagePath };
  const cleanPath = imagePath.replace(/^\/+/, "");
  const fullPath = cleanPath.startsWith("uploads/") ? cleanPath : `uploads/${cleanPath}`;
  return { uri: `${API_URL}/${fullPath}` };
};

// FUNÇÃO CORRIGIDA para "Fêmea" e "Macho" da API
const detectGender = (genero: any): string => {
  if (!genero) return "unknown";
  
  const s = String(genero).trim();
  
  // Feminino - valores que a API pode retornar
  if (s === "Fêmea" || s === "FEMEA" || s === "fêmea" || s === "feminino" || s === "Feminino") {
    return "female";
  }
  
  // Masculino - valores que a API pode retornar
  if (s === "Macho" || s === "MACHO" || s === "macho" || s === "masculino" || s === "Masculino") {
    return "male";
  }
  
  return "unknown";
};

const getTemperatureData = (temp?: number | null) => {
  if (temp == null) return { image: require("../../../assets/chart.png"), text: "--", color: "#ccc" };
  if (temp <= 34) return { image: require("../../../assets/chart-blue.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
  if (temp <= 38) return { image: require("../../../assets/chart-green.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
  if (temp <= 38.7) return { image: require("../../../assets/chart-orange.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
  return { image: require("../../../assets/chart-red.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
};

export default function FarmScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const paramFarm = route.params?.farm ?? null;
  
  const [farmData, setFarmData] = useState({
    nome_fazenda: paramFarm?.nome_fazenda ?? "Fazenda",
    imagem: paramFarm?.imagem ?? null,
    total: 0,
    females: 0,
    males: 0,
    averageTemperature: null as number | null,
  });
  
  const [headerSource, setHeaderSource] = useState<ImageSourcePropType>(getImageUrl(paramFarm?.imagem));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const loadFarm = useCallback(async () => {
    const farmId = paramFarm?.id_fazenda;
    if (!farmId) return;

    try {
      const [animalsRes, measurementsRes] = await Promise.all([
        api.get("/animais"),
        api.get("/medicoes")
      ]);

      const allAnimals = animalsRes.data?.animais || animalsRes.data || [];
      const farmAnimals = allAnimals.filter((a: any) => String(a.id_fazenda) === String(farmId));
      
      const total = farmAnimals.length;
      const females = farmAnimals.filter((a: any) => detectGender(a.genero) === "female").length;
      const males = farmAnimals.filter((a: any) => detectGender(a.genero) === "male").length;
      
      const allMeasurements = measurementsRes.data?.medicoes || measurementsRes.data || [];
      const animalIds = new Set(farmAnimals.map((a: any) => String(a.id_animal)));
      const farmMeasurements = allMeasurements.filter((m: any) => animalIds.has(String(m.id_animal)));
      
      let avgTemp = null;
      if (farmMeasurements.length > 0) {
        const temps = farmMeasurements
          .map((m: any) => Number(m.temp || m.temperatura || 0))
          .filter((t: number) => t > 0);
        if (temps.length > 0) {
          avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
        }
      }

      setFarmData({
        nome_fazenda: paramFarm?.nome_fazenda ?? "Fazenda",
        imagem: paramFarm?.imagem ?? null,
        total,
        females,
        males,
        averageTemperature: avgTemp,
      });
      
      setHeaderSource(getImageUrl(paramFarm?.imagem));
      
    } catch (err) {
      console.error("[Farm] Erro ao carregar dados:", err);
    }
  }, [paramFarm]);

  useFocusEffect(
    useCallback(() => {
      loadFarm();
    }, [loadFarm])
  );

  const handleDeleteFarm = async () => {
    const farmId = paramFarm?.id_fazenda;
    if (!farmId) return;

    try {
      setLoadingDelete(true);
      await api.delete(`/fazendas/${farmId}`);
      Alert.alert("Sucesso", "Fazenda deletada com sucesso.");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.message || err?.message || "Falha ao deletar fazenda.");
    } finally {
      setLoadingDelete(false);
      setShowDeleteModal(false);
    }
  };

  const tempData = getTemperatureData(farmData.averageTemperature);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <ImageBackground 
          source={headerSource} 
          style={styles.headerImage} 
          imageStyle={styles.headerImageRadius} 
          onError={() => setHeaderSource(DEFAULT_FARM_IMAGE)}
        >
          <View style={styles.overlay} />
          <View style={styles.headerTop}>
            <Text style={styles.title}>{farmData.nome_fazenda}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate("EditFarm", { farm: paramFarm })}>
              <Image source={require("../../../assets/edit.png")} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate("Herd", { farm: paramFarm })}>
            <Image source={require("../../../assets/cow-light.png")} style={styles.manageIcon} />
            <Text style={styles.manageText}>Gerenciar rebanho</Text>
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.cardsContainer}>
          <LinearGradient colors={["#847E73", "#38381F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.leftCard}>
            <Image source={require("../../../assets/cow-light.png")} style={styles.cowcard} />
            <Text style={styles.cardLabelmaior}>Quant. {"\n"}total de animais</Text>
            <Text style={styles.cardNumbermaior}>{farmData.total}</Text>
          </LinearGradient>
          <View style={styles.rightColumn}>
            <LinearGradient colors={["#847E73", "#38381F"]} style={styles.smallCard}>
              <View style={styles.cowcardWrapper}>
                <Image source={require("../../../assets/cow-light.png")} style={styles.cowcardmini} />
                <Text style={styles.cardLabel}>Quant. fêmeas</Text>
              </View>
              <Text style={styles.cardNumber}>{farmData.females}</Text>
            </LinearGradient>
            <LinearGradient colors={["#847E73", "#38381F"]} style={styles.smallCard}>
              <View style={styles.cowcardWrapper}>
                <Image source={require("../../../assets/cow-light.png")} style={styles.cowcardmini} />
                <Text style={styles.cardLabel}>Quant. machos</Text>
              </View>
              <Text style={styles.cardNumber}>{farmData.males}</Text>
            </LinearGradient>
          </View>
        </View>

        <TouchableOpacity style={styles.reportButton} onPress={() => navigation.navigate("ReportFarm", { farm: paramFarm })}>
          <Image source={require("../../../assets/report.png")} style={styles.reportIcon} />
          <Text style={styles.reportText}>Gerar relatório da fazenda</Text>
        </TouchableOpacity>

        <Text style={styles.subtitle}>Temperatura Média Geral</Text>
        <View style={styles.temperatureContainer}>
          <Image source={tempData.image} style={styles.temperatureIcon} />
          <View style={styles.overlaytext}>
            <Text style={[styles.temperatureText, { color: tempData.color }]}>{tempData.text}</Text>
          </View>
        </View>
        <Text style={styles.legenda}>Baseado na medição mais recente de cada animal</Text>

        <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)} disabled={loadingDelete}>
          <Text style={styles.deleteButtonText}>Deletar Fazenda</Text>
        </TouchableOpacity>
      </ScrollView>

      <Navbar active="home" />

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Deleção</Text>
            <Text style={styles.modalMessage}>
              Tem certeza que deseja deletar "{farmData.nome_fazenda}"?{"\n\n"}
              Todos os animais dessa fazenda também serão deletados.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowDeleteModal(false)} disabled={loadingDelete}>
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonDelete, loadingDelete && { opacity: 0.6 }]} onPress={handleDeleteFarm} disabled={loadingDelete}>
                <Text style={styles.modalButtonDeleteText}>{loadingDelete ? "Deletando..." : "Deletar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}