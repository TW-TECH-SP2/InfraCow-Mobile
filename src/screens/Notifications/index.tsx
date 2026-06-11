import React, { useState, useEffect } from "react";
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
import api from "../../services/api";
import auth from "../../services/auth";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";

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

const extractAnimals = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.animais)) return payload.animais;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function NotificationsScreen() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const navigation = useNavigation<any>();

  const loadNotifications = async () => {
    const res = await api.get("/notificacoes");
    let animalsSource: any[] = [];
    try {
      const resAnimals = await api.get('/animais');
      animalsSource = extractAnimals(resAnimals.data);
    } catch {
      animalsSource = [];
    }

    const animalById = new Map(
      animalsSource.map((a) => [String(a.id_animal ?? a.id), a])
    );

    return (res.data?.notificacoes || []).map((n: any) => {
      const temp = n.temperatura ?? n.temp ?? null;
      const datetime = `${n.hora ?? ""} ${n.dia ?? ""}/${n.mes ?? ""} ${n.dia_semana ?? ""}`.trim();
      const status = getStatus(Number(temp));
      const animalFromList = animalById.get(String(n.id_animal));
      const imgCandidate =
        animalFromList?.localImageUri ??
        animalFromList?.imagem ??
        n.imagem ??
        n.imagem_animal ??
        n.animal?.imagem ??
        n.image ??
        n.imagemAnimal;
      return {
        id: String(n.id_notificacao),
        name: n.nome_animal ?? "Animal",
        image: resolveImage(imgCandidate),
        imageRaw: imgCandidate ?? null,
        temperature: temp,
        datetime,
        raw: n,
        status,
        animalObj: n.animal ?? animalFromList ?? {
          id_animal: n.id_animal,
          nome_animal: n.nome_animal,
          imagem: n.imagem,
        },
      } as NotificationItem & { raw?: any; animalObj?: any };
    });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const items = await loadNotifications();

        if (mounted) setList(items);
      } catch (e) {
        console.log("Erro carregando notificações", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRemove = async (id: string) => {
    try {
      console.log('[Notifications] Starting delete for id:', id);
      
      const deleteUrl = `/notificacoes/${id}`;
      console.log('[Notifications] DELETE URL:', deleteUrl);
      
      await api.delete(deleteUrl);
      console.log('[Notifications] DELETE successful for id:', id);
      
      if (selected?.id === id) {
        setModalVisible(false);
        setSelected(null);
      }
      
      const refreshed = await loadNotifications();
      setList(refreshed);
      
      Alert.alert('Sucesso', 'Notificação excluída com sucesso.');
    } catch (error: any) {
      console.log('[Notifications] Error deleting notification:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Erro desconhecido';
      console.log('[Notifications] Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        message: errorMsg,
        url: error?.config?.url,
      });
      Alert.alert('Erro', 'Não foi possível excluir a notificação.');
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