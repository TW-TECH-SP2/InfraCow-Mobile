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
import api from "../../services/api";

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

  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [{ data: [] as number[] }]
  });
  const [variacaoTemp, setVariacaoTemp] = useState(0);
  const [loadingChart, setLoadingChart] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    setHeaderImageSource(resolveAnimalImage(animalImage));
  }, [animalImage]);

  useEffect(() => {
    fetchUltimaMedicao();
  }, [animal]);

  useEffect(() => {
    fetchMedicoesPorPeriodo();
  }, [startDate, endDate, animal]);

  const fetchUltimaMedicao = async () => {
    const animalId = animal?.id_animal ?? animal?.id ?? null;
    if (!animalId) return;
    try {
      const respMedicoes = await api.get('/medicoes');
      const todasMedicoes: any[] = Array.isArray(respMedicoes.data) ? respMedicoes.data : Array.isArray(respMedicoes.data?.medicoes) ? respMedicoes.data.medicoes : [];
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

  const fetchMedicoesPorPeriodo = async () => {
    const animalId = animal?.id_animal ?? animal?.id ?? null;
    if (!animalId) return;

    setLoadingChart(true);
    try {
      const respMedicoes = await api.get('/medicoes');
      const todasMedicoes: any[] = Array.isArray(respMedicoes.data) ? respMedicoes.data : Array.isArray(respMedicoes.data?.medicoes) ? respMedicoes.data.medicoes : [];
      
      const medicoesFiltradas = todasMedicoes.filter((m: any) => {
        const idMatch = String(m.id_animal) === String(animalId);
        const dataMedicao = new Date(m.datahora);
        const dataInicio = new Date(startDate);
        const dataFim = new Date(endDate);
        dataFim.setHours(23, 59, 59);
        const dataMatch = dataMedicao >= dataInicio && dataMedicao <= dataFim;
        return idMatch && dataMatch;
      });

      medicoesFiltradas.sort((a: any, b: any) => new Date(a.datahora).getTime() - new Date(b.datahora).getTime());

      if (medicoesFiltradas.length === 0) {
        setChartData({ labels: [], datasets: [{ data: [] }] });
        setVariacaoTemp(0);
        setLoadingChart(false);
        return;
      }

      const labels = medicoesFiltradas.map((m: any) => {
        const d = new Date(m.datahora);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      });

      const temperatures = medicoesFiltradas.map((m: any) => Number(m.temp));

      const maxTemp = Math.max(...temperatures);
      const minTemp = Math.min(...temperatures);
      const variacao = maxTemp - minTemp;

      setChartData({
        labels: labels,
        datasets: [{ data: temperatures }]
      });
      setVariacaoTemp(variacao);

    } catch (err) {
      console.error('Erro ao buscar medições:', err);
      Alert.alert('Erro', 'Não foi possível carregar as medições');
    } finally {
      setLoadingChart(false);
    }
  };

  const getTemperatureData = (temp?: number | null) => {
    if (temp === null || temp === undefined) {
      return { image: require("../../../assets/chartanimal.png"), text: "--", color: "#ccc" };
    }
    if (temp <= 34) return { image: require("../../../assets/chartanimal-blue.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
    if (temp <= 38) return { image: require("../../../assets/chartanimal-green.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
    if (temp <= 38.7) return { image: require("../../../assets/chartanimal-orange.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
    return { image: require("../../../assets/chartanimal-red.png"), text: `${temp.toFixed(1)}°C`, color: "#fff" };
  };

  const handleDeleteAnimal = async () => {
    const animalId = animal?.id_animal ?? animal?.id;
    if (!animalId) return;

    setLoadingDelete(true);
    try {
      await api.delete(`/animais/${animalId}`);
      Alert.alert('Sucesso', 'Animal deletado com sucesso.');
      navigation.goBack();
    } catch (err: any) {
      console.error('Animal Delete error:', err);
      Alert.alert('Erro', err?.response?.data?.message ?? err?.message ?? 'Erro inesperado ao deletar animal');
    } finally {
      setLoadingDelete(false);
      setShowDeleteModal(false);
    }
  };

  const { width } = useWindowDimensions();
  const tempData = getTemperatureData(ultimaMedicao ?? averageTemperature);

  const chartWidth = Math.max(width - 32, chartData.labels.length * 60);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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
              <Image source={require("../../../assets/back-light.png")} style={styles.backIcon} />
            </TouchableOpacity>

            <View style={styles.headerTop}>
              <Text style={styles.title}>Ficha de dados de: {"\n"}{animalName}</Text>
              <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate("EditAnimal", { animal })}>
                <Image source={require("../../../assets/edit.png")} style={styles.editIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.temperatureContainer}>
              <Image source={tempData.image} style={styles.temperatureIcon} />
              <View style={styles.overlaytext}>
                <Text style={[styles.temperatureText, { color: tempData.color }]}>{tempData.text}</Text>
              </View>
            </View>

            <Text style={styles.legenda}>Última medição em: {dataUltimaMedicao}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.newMeasurement} onPress={() => navigation.navigate("Position")}>
                <Image source={require("../../../assets/measurev2.png")} style={styles.editIcon} />
                <Text style={styles.newMeasurementText}>Nova medição</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.report}>
                <Image source={require("../../../assets/report-dark.png")} style={styles.editIcon} />
                <Text style={styles.reporttText} onPress={() => navigation.navigate("ReportAnimal", { animal })}>Relatório</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.chartvar}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Histórico de medições</Text>
            <View style={styles.varContainer}>
              <Text allowFontScaling={false} style={styles.varLabel}>Var. de temp.</Text>
              <Text style={styles.varValue}>{variacaoTemp.toFixed(2)}°C</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <Text allowFontScaling={false}>
                De: {startDate.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
              <Text allowFontScaling={false}>
                À: {endDate.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={showStartPicker}
            mode="date"
            date={startDate}
            onConfirm={(date) => { 
              setStartDate(date); 
              setShowStartPicker(false);
            }}
            onCancel={() => setShowStartPicker(false)}
          />
          <DateTimePickerModal
            isVisible={showEndPicker}
            mode="date"
            date={endDate}
            onConfirm={(date) => { 
              setEndDate(date); 
              setShowEndPicker(false);
            }}
            onCancel={() => setShowEndPicker(false)}
          />

          {loadingChart ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Carregando...</Text>
          ) : chartData.labels.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhuma medição encontrada neste período</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={chartData}
                width={chartWidth}
                height={220}
                fromZero={false}
                yAxisLabel=""
                yAxisSuffix="°C"
                withHorizontalLabels={true}
                withInnerLines={true}
                chartConfig={{
                  barPercentage: 0.7,
                  backgroundGradientFrom: "#F2F2F2",
                  backgroundGradientTo: "#F2F2F2",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `#4D5C52`,
                  labelColor: (opacity = 1) => `#000`,
                  propsForBackgroundLines: { stroke: "#eee" },
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 8,
                }}
              />
            </ScrollView>
          )}
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)} disabled={loadingDelete}>
          <Text style={styles.deleteButtonText}>Deletar Animal</Text>
        </TouchableOpacity>
      </ScrollView>

      <Navbar />

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Deleção</Text>
            <Text style={styles.modalMessage}>
              Tem certeza que deseja deletar "{animalName}"?{"\n\n"}
              Todos os dados e medições deste animal serão deletados.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowDeleteModal(false)} disabled={loadingDelete}>
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonDelete, loadingDelete && { opacity: 0.6 }]} onPress={handleDeleteAnimal} disabled={loadingDelete}>
                <Text style={styles.modalButtonDeleteText}>{loadingDelete ? "Deletando..." : "Deletar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}