import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageSourcePropType,
} from "react-native";
import styles from "./styles";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { getAnimaisByFazenda, getMedicoesByAnimal } from "../../storage/repository";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const DEFAULT_FARM_NAME = "Fazenda";
const DEFAULT_ANIMAL_IMAGE = require("../../../assets/cow1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveAnimalImageUri = (image?: string | null): string | null => {
  const normalized = String(image ?? "").trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return null;
  }
  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) {
    return normalized;
  }
  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  return `${getApiBaseUrl().replace(/\/$/, "")}/${path}`;
};

const resolveAnimalImage = (image?: string | null): ImageSourcePropType => {
  const uri = resolveAnimalImageUri(image);
  return uri ? { uri } : DEFAULT_ANIMAL_IMAGE;
};

type AnimalRow = { name: string; temp: number; imageUri: string | null; image: ImageSourcePropType };


const getStatus = (temp: number) => {
  if (temp < 36) return "Baixa";
  if (temp > 39) return "Alta";
  return "Normal";
};

export default function ReportFarm() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [farmName, setFarmName] = useState<string>(DEFAULT_FARM_NAME);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        setLoading(true);
        setError(null);
        const farm = route.params?.farm ?? null;
        const farmId = farm?.id_fazenda ?? farm?.id ?? null;
        if (farm?.nome_fazenda) setFarmName(farm.nome_fazenda);

        if (!farmId) {
          setError('Fazenda inválida');
          setLoading(false);
          return;
        }

        // Relatório é gerado a partir do que está salvo no celular — não
        // depende de internet nem espera nenhum sync.
        const animaisDaFazenda = getAnimaisByFazenda(String(farmId));

        const mapped: AnimalRow[] = animaisDaFazenda.map((a: any) => {
          const idAnimal = a.id_animal ?? a.id;
          const medicoesDoAnimal = getMedicoesByAnimal(String(idAnimal));

          const ultimaMedicao = [...medicoesDoAnimal].sort(
            (m1: any, m2: any) => new Date(m2.datahora).getTime() - new Date(m1.datahora).getTime()
          )[0];

          const temp = ultimaMedicao ? Number(ultimaMedicao.temp) : 0;
          const imageSource = a.localImageUri ?? a.imagem ?? a.image ?? null;

          return {
            name: a.nome_animal ?? a.nome ?? a.name ?? 'Animal',
            temp,
            imageUri: resolveAnimalImageUri(imageSource),
            image: resolveAnimalImage(imageSource),
          };
        });

        setAnimals(mapped);
      } catch (err: any) {
        console.error('Erro ao carregar relatório da fazenda', err);
        setError('Falha ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [route.params]);

  const measured = animals.length;

  const avgTemp = measured > 0 ? animals.reduce((acc, a) => acc + a.temp, 0) / measured : 0;

  const alerts = animals.filter((a) => a.temp < 36 || a.temp > 39).length;

  const generateHTML = () => {
    const rows = animals
      .map(
        (a) => `
        <tr>
          <td>${a.imageUri ? `<img src="${a.imageUri}" width="50" height="50" style="border-radius: 6px; object-fit: cover;" />` : ''}</td>
          <td>${a.name}</td>
          <td>${a.temp}°C</td>
          <td>${getStatus(a.temp)}</td>
        </tr>
      `
      )
      .join("");

    return `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>Relatório da fazenda: ${farmName}</h1>

          <h3>Resumo</h3>
          <p><strong>Animais medidos:</strong> ${measured}</p>
          <p><strong>Média da semana:</strong> ${avgTemp.toFixed(1)}°C</p>
          <p><strong>Alertas:</strong> ${alerts}</p>

          <h3>Animais</h3>
          <table border="1" cellspacing="0" cellpadding="8" width="100%">
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Temperatura</th>
              <th>Status</th>
            </tr>
            ${rows}
          </table>
        </body>
      </html>
    `;
  };

  const handleDownload = async () => {
    const html = generateHTML();

    const { uri } = await Print.printToFileAsync({
      html,
    });

    await Sharing.shareAsync(uri);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.title}>
          Relatório da fazenda:{"\n"}
          {farmName}
        </Text>

        {loading && <Text style={styles.info}>Carregando...</Text>}
        {error && <Text style={[styles.info, { color: 'red' }]}>{error}</Text>}

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Medidos</Text>
            <Text style={styles.summaryValue}>{measured}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Média</Text>
            <Text style={styles.summaryValue}>
              {avgTemp.toFixed(1)}°C
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Alertas</Text>
            <Text style={styles.summaryValue}>{alerts}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {animals.map((item, index) => (
            <View key={index} style={[styles.row, { flexDirection: 'row', alignItems: 'center' }]}>
              <Image source={item.image} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12 }} />
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.info}>{item.temp}°C • {getStatus(item.temp)}</Text>
              </View>
            </View>
          ))}
          {animals.length === 0 && !loading && (
            <Text style={styles.info}>Nenhum dado disponível.</Text>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
        <Image
          source={require("../../../assets/download.png")}
          style={styles.downloadIcon}
        />
        <Text style={styles.downloadText}> Baixar arquivo</Text>
      </TouchableOpacity>
    </View>
  );
}