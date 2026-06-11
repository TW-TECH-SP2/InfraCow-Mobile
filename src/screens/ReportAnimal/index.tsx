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

const DATE_FORMAT = (iso?: string) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch (e) { return iso; }
};

type Medicao = { date: string; temp: number };

const getStatus = (temp: number) => {
  if (temp < 33.6) return "Hipotermia";
  if (temp > 37) return "Febre";
  return "Normal";
};

export default function ReportAnimal() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [animalName, setAnimalName] = useState<string>('Animal');
  const [animalData, setAnimalData] = useState<any>(null);
  const [history, setHistory] = useState<Medicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const animal = route.params?.animal ?? null;
        const animalId = animal?.id_animal ?? animal?.id ?? null;

        if (!animalId) {
          setError('Animal inválido');
          setLoading(false);
          return;
        }

        const animalResp = await api.get(`/animais/${animalId}`);
        const animalInfo = animalResp.data?.animal ?? animalResp.data ?? null;
        if (animalInfo) {
          setAnimalName(animalInfo.nome_animal ?? 'Animal');
          setAnimalData(animalInfo);
        }

        const respMedicoes = await api.get('/medicoes');
        const todasMedicoes: any[] = Array.isArray(respMedicoes.data) ? respMedicoes.data : Array.isArray(respMedicoes.data?.medicoes) ? respMedicoes.data.medicoes : [];

        const medicoesDoAnimal = todasMedicoes
          .filter((m: any) => String(m.id_animal) === String(animalId))
          .sort((a: any, b: any) => new Date(b.datahora).getTime() - new Date(a.datahora).getTime());

        const mapped: Medicao[] = medicoesDoAnimal
          .map((m: any) => ({
            date: DATE_FORMAT(m.datahora),
            temp: Number(m.temp ?? 0),
          }))
          .filter((m) => m.temp > 0);

        setHistory(mapped);
      } catch (err: any) {
        console.error('Erro ao carregar relatório do animal', err);
        setError('Falha ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [route.params]);

  const generateHTML = () => {
    const rows = history
      .map((item) => `
        <tr>
          <td>${item.date}</td>
          <td>${item.temp}°C</td>
          <td>${getStatus(item.temp)}</td>
        </tr>
      `).join("");

    return `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>Relatório de bovino: ${animalName}</h1>

          <h3>Dados do animal</h3>
          <p><strong>Raça:</strong> ${animalData?.raca ?? '-'}</p>
          <p><strong>Gênero:</strong> ${animalData?.genero ?? '-'}</p>
          <p><strong>Tipo:</strong> ${animalData?.tipo ?? '-'}</p>
          <p><strong>Peso:</strong> ${animalData?.peso ?? '-'} kg</p>
          <p><strong>Idade:</strong> ${animalData?.idade ?? '-'} anos</p>
          ${animalData?.codigo ? `<p><strong>Código:</strong> ${animalData.codigo}</p>` : ''}

          <h3>Histórico de medições</h3>
          <table border="1" cellspacing="0" cellpadding="8" width="100%">
            <tr>
              <th>Data</th>
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
    try {
      const html = generateHTML();
      await new Promise(resolve => setTimeout(resolve, 100));
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.log("Erro ao gerar PDF:", error);
    }
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
          Relatório de bovino:{"\n"}
          {animalName}
        </Text>

        {loading && <Text style={styles.label}>Carregando...</Text>}
        {error && <Text style={[styles.label, { color: 'red' }]}>{error}</Text>}

        {animalData && (
          <View style={styles.summary}>
            <View style={styles.row}>
              <Text style={styles.label}>Raça</Text>
              <Text style={styles.value}>{animalData.raca ?? '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gênero</Text>
              <Text style={styles.value}>{animalData.genero ?? '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tipo</Text>
              <Text style={styles.value}>{animalData.tipo ?? '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Peso</Text>
              <Text style={styles.value}>{animalData.peso ?? '-'} kg</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Idade</Text>
              <Text style={styles.value}>{animalData.idade ?? '-'} anos</Text>
            </View>
            {animalData.codigo && (
              <View style={styles.row}>
                <Text style={styles.label}>Código</Text>
                <Text style={styles.value}>{animalData.codigo}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.title}>Histórico de medições</Text>
        <View style={styles.table}>
          {history.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{item.date}</Text>
              <Text style={styles.value}>{item.temp}°C</Text>
              <Text style={styles.status}>{getStatus(item.temp)}</Text>
            </View>
          ))}
          {!loading && history.length === 0 && (
            <Text style={styles.label}>Nenhuma medição encontrada.</Text>
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
