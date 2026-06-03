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
import cache from "../../services/cache";
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

      let allAnimals: any[] = [];
      const cachedAnimalsRaw = await cache.getCache('/animais');
      if (Array.isArray(cachedAnimalsRaw)) {
        allAnimals = cachedAnimalsRaw;
      } else if (cachedAnimalsRaw?.animais && Array.isArray(cachedAnimalsRaw.animais)) {
        allAnimals = cachedAnimalsRaw.animais;
      } else if (cachedAnimalsRaw?.data && Array.isArray(cachedAnimalsRaw.data)) {
        allAnimals = cachedAnimalsRaw.data;
      }

      if (!allAnimals || allAnimals.length === 0) {
        const resp = await api.get('/animais');
        if (Array.isArray(resp.data)) {
          allAnimals = resp.data;
        } else if (resp.data?.animais) {
          allAnimals = resp.data.animais;
        } else if (resp.data?.data) {
          allAnimals = resp.data.data;
        }
        if (allAnimals.length > 0) await cache.setCache('/animais', allAnimals);
      }

      const animaisDaFazenda = allAnimals.filter((a: any) => {
        const aFarmId = String(a.id_fazenda ?? a.farm_id ?? a.fazenda_id ?? '').trim();
        return aFarmId === String(farmId);
      });

      let todasMedicoes: any[] = [];
      const cachedMedicoes = await cache.getCache('/medicoes');
      if (cachedMedicoes?.medicoes && Array.isArray(cachedMedicoes.medicoes)) {
        todasMedicoes = cachedMedicoes.medicoes;
      } else if (Array.isArray(cachedMedicoes)) {
        todasMedicoes = cachedMedicoes;
      }

      if (todasMedicoes.length === 0) {
        const respMedicoes = await api.get('/medicoes');
        if (respMedicoes.data?.medicoes && Array.isArray(respMedicoes.data.medicoes)) {
          todasMedicoes = respMedicoes.data.medicoes;
        } else if (Array.isArray(respMedicoes.data)) {
          todasMedicoes = respMedicoes.data;
        }
        if (todasMedicoes.length > 0) await cache.setCache('/medicoes', todasMedicoes);
      }

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
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.title}>
          Relatório da fazenda:{"\n"}
          {farmName}
        </Text>

        {loading && <Text style={styles.info}>Carregando...</Text>}
        {error && <Text style={[styles.info, { color: 'red' }]}>{error}</Text>}

        {/* 🔹 RESUMO */}
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

        {/* 🔹 LISTA */}
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

      {/* BOTÃO FIXO */}
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