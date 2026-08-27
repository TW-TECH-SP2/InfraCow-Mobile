import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import styles from "./styles";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import api from "../../services/api";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const DEFAULT_FARM_NAME = "Fazenda";

type AnimalRow = { name: string; temp: number };


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
  const load = async () => {
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

      const resp = await api.get('/animais');
      const allAnimals = Array.isArray(resp.data) ? resp.data : Array.isArray(resp.data?.animais) ? resp.data.animais : [];

      const animaisDaFazenda = allAnimals.filter((a: any) => {
        const aFarmId = String(a.id_fazenda ?? a.farm_id ?? a.fazenda_id ?? '').trim();
        return aFarmId === String(farmId);
      });

      const respMedicoes = await api.get('/medicoes');
      const todasMedicoes = Array.isArray(respMedicoes.data) ? respMedicoes.data : Array.isArray(respMedicoes.data?.medicoes) ? respMedicoes.data.medicoes : [];

      const mapped: AnimalRow[] = animaisDaFazenda.map((a: any) => {
        const idAnimal = a.id_animal ?? a.id;

        const medicoesDoAnimal = todasMedicoes.filter(
          (m: any) => String(m.id_animal) === String(idAnimal)
        );

        const ultimaMedicao = medicoesDoAnimal.sort(
          (a: any, b: any) => new Date(b.datahora).getTime() - new Date(a.datahora).getTime()
        )[0];

        const temp = ultimaMedicao ? Number(ultimaMedicao.temp) : 0;

        return {
          name: a.nome_animal ?? a.nome ?? a.name ?? 'Animal',
          temp,
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
            <View key={index} style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.info}>{item.temp}°C • {getStatus(item.temp)}</Text>
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