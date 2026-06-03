import {
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ImageSourcePropType,
  Modal,
  Alert,
} from "react-native";
import Text from "../../components/Text";
import styles from "./styles";
import { LinearGradient } from "expo-linear-gradient";
import Navbar from "../../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { BarChart } from "react-native-chart-kit";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useWindowDimensions } from "react-native";
import Constants from "expo-constants";
import cache from "../../services/cache";
import api from "../../services/api";
import auth from "../../services/auth";
import offlineSync from "../../services/offlineSync";


const DEFAULT_ANIMAL_IMAGE = require("../../../assets/cow1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveAnimalImage = (image?: string | null): ImageSourcePropType => {
  if (!image) return DEFAULT_ANIMAL_IMAGE;

  const normalized = String(image).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return DEFAULT_ANIMAL_IMAGE;
  }

  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) {
    return { uri: normalized };
  }

  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  return { uri: `${baseUrl}/${path}` };
};

const mockAnimalData = {
  varTemperature: 0.5,
};

const data = {
  labels: ["1", "5", "10", "15", "20", "25", "30"],
  datasets: [
    {
      data: [36, 37, 38, 39, 37.5, 36.8, 38.2],
    },
  ],
};


export default function AnimalScreen() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [headerImageSource, setHeaderImageSource] = useState<ImageSourcePropType>(DEFAULT_ANIMAL_IMAGE);

  const animal = route.params?.animal ?? {};
  const animalName = animal.nome_animal ?? animal.nome ?? animal.name ?? "Animal";
  const animalImage = animal.localImageUri ?? animal.imagem ?? animal.image ?? null;
  const averageTemperature = animal.averageTemperature ?? animal.temperatura_media ?? null;

  const [ultimaMedicao, setUltimaMedicao] = useState<number | null>(null);
  const [dataUltimaMedicao, setDataUltimaMedicao] = useState<string>('--');

  useEffect(() => {
    setHeaderImageSource(resolveAnimalImage(animalImage));
  }, [animalImage]);

  useEffect(() => {
    const fetchUltimaMedicao = async () => {
      const animalId = animal?.id_animal ?? animal?.id ?? null;
      if (!animalId) return;

      try {
        const respMedicoes = await api.get('/medicoes');
        let todasMedicoes: any[] = [];

        if (respMedicoes.data?.medicoes && Array.isArray(respMedicoes.data.medicoes)) {
          todasMedicoes = respMedicoes.data.medicoes;
        } else if (Array.isArray(respMedicoes.data)) {
          todasMedicoes = respMedicoes.data;
        }

        const medicoesDoAnimal = todasMedicoes
          .filter((m: any) => String(m.id_animal) === String(animalId))
          .sort((a: any, b: any) => new Date(b.datahora).getTime() - new Date(a.datahora).getTime());

        if (medicoesDoAnimal.length > 0) {
          setUltimaMedicao(Number(medicoesDoAnimal[0].temp));

          const d = new Date(medicoesDoAnimal[0].datahora);
          setDataUltimaMedicao(
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          );
        }
      } catch (err) {
        console.error('Erro ao buscar última medição:', err);
      }
    };

    fetchUltimaMedicao();
  }, [animal]);

  const getTemperatureData = (temp?: number | null) => {
    if (temp === null || temp === undefined) {
      return {
        image: require("../../../assets/chartanimal.png"),
        text: "--",
        color: "#ccc",
      };
    }

    if (temp <= 34) {
      return {
        image: require("../../../assets/chartanimal-blue.png"),
        text: `${temp.toFixed(1)}°C`,
        color: "#fff",
      };
    }

    if (temp <= 38) {
      return {
        image: require("../../../assets/chartanimal-green.png"),
        text: `${temp.toFixed(1)}°C`,
        color: "#fff",
      };
    }

    if (temp <= 38.7) {
      return {
        image: require("../../../assets/chartanimal-orange.png"),
        text: `${temp.toFixed(1)}°C`,
        color: "#fff",
      };
    }

    return {
      image: require("../../../assets/chartanimal-red.png"),
      text: `${temp.toFixed(1)}°C`,
      color: "#fff",
    };
  };

  const handleDeleteAnimal = async () => {
    if (!animal?.id_animal && !animal?.id) return;

    setLoadingDelete(true);
    const animalId = animal.id_animal ?? animal.id;
    try {
      const currentUser = await auth.getLoggedUser();

      if (!currentUser?.id_usuario) {
        Alert.alert('Erro', 'Você precisa estar autenticado para deletar.');
        setLoadingDelete(false);
        return;
      }

      const clientTempId = `animal_delete_${animalId}_${Date.now()}`;

      await offlineSync.optimisticUpdate({
        endpoint: `/animais/${animalId}`,
        method: 'delete',
        data: { id_usuario: currentUser.id_usuario },
        cacheKey: '/animais',
        clientTempId,
        onOptimisticUpdate: async () => {
          const cachedAnimalsRaw = await cache.getCache('/animais');
          const cachedAnimals = Array.isArray(cachedAnimalsRaw)
            ? cachedAnimalsRaw
            : Array.isArray(cachedAnimalsRaw?.animais)
              ? cachedAnimalsRaw.animais
              : [];
          const updatedAnimals = cachedAnimals.filter((a: any) => String(a.id_animal ?? a.id) !== String(animalId));
          await cache.setCache('/animais', updatedAnimals);
        },
        onSuccess: async () => {
          Alert.alert('Sucesso', 'Animal deletado com sucesso.');
        },
        onError: (error) => {
          const message = error?.response?.data?.message || error?.message || 'Falha ao deletar animal. Tente novamente.';
          console.error('Animal Delete Error:', message);
          Alert.alert('Erro', message);
        },
      });

      navigation.goBack();

    } catch (err: any) {
      console.error('Animal Delete Unexpected error:', err);
      Alert.alert('Erro', 'Erro inesperado ao deletar animal');
    } finally {
      setLoadingDelete(false);
      setShowDeleteModal(false);
    }
  };

  const { width, height } = useWindowDimensions();
  const chartWidth = width - 40 - 30;

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const tempData = getTemperatureData(ultimaMedicao ?? averageTemperature);

  return (
    <View style={{ flex: 1 }}>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* header */}
        <ImageBackground
          source={headerImageSource}
          style={styles.headerImage}
          imageStyle={styles.headerImageRadius}
          resizeMode="cover"
          onError={() => setHeaderImageSource(DEFAULT_ANIMAL_IMAGE)}
        >
          <View style={styles.overlay} />
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image
                source={require("../../../assets/back-light.png")}
                style={styles.backIcon}
              />
            </TouchableOpacity>

            <View style={styles.headerTop}>
              <Text style={styles.title}>
                Ficha de dados de: {"\n"}{animalName}
              </Text>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("EditAnimal", { animal })}
              >
                <Image
                  source={require("../../../assets/edit.png")}
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.temperatureContainer}>
              <Image
                source={tempData.image}
                style={styles.temperatureIcon}
              />

              <View style={styles.overlaytext}>
                <Text
                  style={[
                    styles.temperatureText,
                    { color: tempData.color }
                  ]}
                >
                  {tempData.text}
                </Text>
              </View>
            </View>

            <Text style={styles.legenda}>
              Última medição em: {dataUltimaMedicao}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.newMeasurement}
                onPress={() => navigation.navigate("Position")}
              >
                <Image
                  source={require("../../../assets/measurev2.png")}
                  style={styles.editIcon}
                />
                <Text style={styles.newMeasurementText}>Nova medição</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.report}>
                <Image
                  source={require("../../../assets/report-dark.png")}
                  style={styles.editIcon}
                />
                <Text
                  style={styles.reporttText}
                  onPress={() => navigation.navigate("ReportAnimal", { animal })}
                >
                  Relatório
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.chartvar}>

          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              Histórico de medições
            </Text>

            <View style={styles.varContainer}>
              <Text allowFontScaling={false} style={styles.varLabel}>Var. de temp.</Text>
              <Text style={styles.varValue}>
                {mockAnimalData.varTemperature.toFixed(2)}°C
              </Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text allowFontScaling={false}>De</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text allowFontScaling={false}>À</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={data}
              width={data.labels.length * 60}
              height={180}
              fromZero
              yAxisLabel=""
              yAxisSuffix="°C"
              withHorizontalLabels={true}
              withInnerLines={true}
              chartConfig={{
                barPercentage: 0.5,
                backgroundGradientFrom: "#F2F2F2",
                backgroundGradientTo: "#F2F2F2",
                decimalPlaces: 1,
                color: () => "#4D5C52",
                labelColor: () => "#000",
                propsForBackgroundLines: {
                  stroke: "#eee",
                },
              }}
            />
          </ScrollView>

          <DateTimePickerModal
            isVisible={showStartPicker}
            mode="date"
            onConfirm={(date) => {
              setStartDate(date);
              setShowStartPicker(false);
            }}
            onCancel={() => setShowStartPicker(false)}
          />

          <DateTimePickerModal
            isVisible={showEndPicker}
            mode="date"
            onConfirm={(date) => {
              setEndDate(date);
              setShowEndPicker(false);
            }}
            onCancel={() => setShowEndPicker(false)}
          />
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setShowDeleteModal(true)}
          disabled={loadingDelete}
        >
          <Text style={styles.deleteButtonText}>Deletar Animal</Text>
        </TouchableOpacity>

      </ScrollView>

      <Navbar active="home" />

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
              Tem certeza que deseja deletar "{animalName}"?{"\n\n"}
              Todos os dados e medições deste animal serão deletados.
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
                onPress={handleDeleteAnimal}
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