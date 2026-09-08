import React, { useState, useCallback } from "react";
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import Text from "../../components/Text";
import {
  GestureHandlerRootView,
  Swipeable,
  RectButton,
} from "react-native-gesture-handler";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import Constants from "expo-constants";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Alert } from "react-native";
import { getNotifications, deleteNotification, getAnimalById } from "../../storage/repository";
import { runSync } from "../../services/syncManager";

type NotificationItem = {
  id: string;
  name: string;
  image: any;
  imageRaw?: string | null;
  temperature: number | null;
  datetime: string;
  status: {
    type: "low" | "high" | "normal";
    message: string;
    background: string;
  };
  raw?: any;
  animalObj?: any;
};

const getStatus = (temp?: number | null) => {
  const val = temp == null ? null : Number(temp);
  if (val == null || Number.isNaN(val)) {
    return {
      type: "normal",
      message: "Leitura indisponível",
      background: "#fff",
    };
  }

  if (val <= 34) {
    return {
      type: "low",
      message:
        "Apresentou HIPOTERMIA em sua última medição! Procure um veterinário!",
      background: "#f8caca",
    };
  }

  if (val >= 38.7) {
    return {
      type: "high",
      message:
        "Apresentou hipertermia (febre) em sua última medição! Procure um veterinário!",
      background: "#f8caca",
    };
  }

  return {
    type: "normal",
    message: "Apresentou temperatura normal em sua última medição!",
    background: "#fff",
  };
};

const DEFAULT_ANIMAL_IMAGE = require("../../../assets/cow1.png");

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Antes o servidor mandava hora/dia/mes/dia_semana já separados; agora a
// notificação é gerada local a partir de medicao.datahora (ISO), então
// formatamos aqui.
const formatDatetime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dia = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${hora} ${dia} ${DIAS_SEMANA[d.getDay()]}`;
};

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (img?: string | null) => {
  if (!img) return DEFAULT_ANIMAL_IMAGE;
  const s = String(img || "").trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return DEFAULT_ANIMAL_IMAGE;
  if (/^https?:\/\//i.test(s) || /^(file:|blob:|data:)/i.test(s)) return { uri: s };
  const clean = s.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  return { uri: `${getApiBaseUrl().replace(/\/$/, "")}/${path}` };
};

const buildImageCandidates = (raw?: string | null): string[] => {
  const s = String(raw ?? "").trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return [];
  }

  if (/^https?:\/\//i.test(s) || /^(file:|blob:|data:)/i.test(s)) {
    return [s];
  }

  const clean = s.replace(/^\/+/, "").replace(/\\/g, "/");
  const base = getApiBaseUrl().replace(/\/$/, "");
  const withUploads = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;

  if (/\.(png|jpe?g|webp|gif)$/i.test(withUploads)) {
    return [`${base}/${withUploads}`];
  }

  return [
    `${base}/${withUploads}`,
    `${base}/${withUploads}.jpg`,
    `${base}/${withUploads}.jpeg`,
    `${base}/${withUploads}.png`,
    `${base}/${withUploads}.webp`,
  ];
};

export default function NotificationsScreen() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const navigation = useNavigation<any>();

  // Lê as notificações já geradas localmente (por saveMedicaoLocally, toda
  // vez que uma medição é salva — offline ou online — e também quando o
  // sync baixa medições novas do servidor via upsertMedicoes). Não depende
  // mais do endpoint /notificacoes.
  const loadFromLocal = (): NotificationItem[] => {
    const rows = getNotifications();
    return rows.map((n: any) => {
      const temp = n.temp;
      const status = getStatus(Number(temp));
      const animalFromLocal = n.id_animal ? getAnimalById(String(n.id_animal)) : null;
      const imgCandidate = animalFromLocal?.localImageUri ?? animalFromLocal?.imagem ?? n.imagem ?? null;

      return {
        id: n.id,
        name: n.nome_animal ?? animalFromLocal?.nome_animal ?? "Animal",
        image: resolveImage(imgCandidate),
        imageRaw: imgCandidate,
        temperature: temp,
        datetime: formatDatetime(n.datahora),
        raw: n,
        status,
        animalObj: animalFromLocal ?? {
          id_animal: n.id_animal,
          nome_animal: n.nome_animal,
          imagem: n.imagem,
        },
      } as NotificationItem & { raw?: any; animalObj?: any };
    });
  };

  // Mostra as notificações locais na hora, sincroniza em paralelo (baixa
  // medições novas do servidor — o que pode gerar notificações novas via
  // upsertMedicoes) e relê. Sem internet, fica só com o que já tinha local.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const load = async () => {
        try {
          if (mounted) setList(loadFromLocal());
          await runSync();
        } catch (e) {
          console.log("Erro sincronizando notificações", e);
        } finally {
          if (mounted) {
            setList(loadFromLocal());
            setLoading(false);
          }
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const handleRemove = (id: string) => {
    // Notificação é uma entidade só local (nunca existiu no servidor pra
    // esse app), então apagar é só remover do SQLite — não precisa de rede.
    try {
      deleteNotification(id);
      if (selected?.id === id) {
        setModalVisible(false);
        setSelected(null);
      }
      setList(loadFromLocal());
    } catch (error) {
      console.log("[Notifications] Erro ao excluir notificação local:", error);
      Alert.alert("Erro", "Não foi possível excluir a notificação.");
    }
  };

  const renderRightActions = (id: string) => (
    <View style={styles.checkContainer}>
      <RectButton onPress={() => handleRemove(id)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={require("../../../assets/check.png")}
          style={styles.check}
        />
      </RectButton>
    </View>
  );

  const openDetail = (item: NotificationItem) => {
    setSelected(item);
    setModalVisible(true);
  };

  const FallbackImage = ({ source, imageRaw, style }: { source: any; imageRaw?: string | null; style?: any }) => {
    const candidates = buildImageCandidates(imageRaw);
    const initialUri = source?.uri;
    const ordered = initialUri
      ? [initialUri, ...candidates.filter((uri) => uri !== initialUri)]
      : candidates;

    const [idx, setIdx] = useState(0);
    const [useDefault, setUseDefault] = useState(false);

    if (typeof source === "number") {
      return <Image source={source} style={style} />;
    }

    if (useDefault || ordered.length === 0) {
      return <Image source={DEFAULT_ANIMAL_IMAGE} style={style} />;
    }

    const current = ordered[idx];

    return (
      <Image
        source={{ uri: current }}
        style={style}
        onError={() => {
          if (idx < ordered.length - 1) {
            setIdx((prev) => prev + 1);
            return;
          }
          setUseDefault(true);
        }}
      />
    );
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      overshootRight={false}   
      friction={2}             
      rightThreshold={40}      
    >
      <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.8}>
        <View
          style={[
            styles.card,
            { backgroundColor: item.status.background },
          ]}
        >
          <Text style={styles.date}>{item.datetime}</Text>

          <View style={styles.row}>
            <FallbackImage source={item.image} imageRaw={item.imageRaw} style={styles.image} />

            <View style={styles.textContainer}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.message}>{item.status.message}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const closeModal = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const navigateToAnimal = (animalObj: any) => {
    if (!animalObj) return;
    navigation.navigate("Animal", { animal: animalObj });
    closeModal();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Notificações</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#282113" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Navbar active="notifications" />

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '86%', backgroundColor: '#fff', borderRadius: 8, padding: 18 }}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>{selected?.name}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>{selected?.temperature ?? '--'}°C</Text>

              {selected && selected.status.type !== 'normal' ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 6 }}>Riscos possíveis:</Text>
                  {selected.status.type === 'low' ? (
                    <View>
                      <Text>- Hipotermia</Text>
                      <Text>- Diminuição de apetite</Text>
                      <Text>- Redução da produção</Text>
                      <Text>- Risco de infecções e choque em casos severos</Text>
                    </View>
                  ) : (
                    <View>
                      <Text>- Hipertermia / Febre</Text>
                      <Text>- Desidratação</Text>
                      <Text>- Estresse térmico</Text>
                      <Text>- Risco de morte em casos severos</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={{ marginBottom: 12 }}>Leitura dentro dos parâmetros esperados.</Text>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                <TouchableOpacity onPress={closeModal} style={{ marginRight: 12 }}>
                  <Text style={{ color: '#666' }}>Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateToAnimal(selected?.animalObj)}
                  style={{ backgroundColor: '#282113', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 }}
                >
                  <Text style={{ color: '#fff' }}>Ver ficha</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}