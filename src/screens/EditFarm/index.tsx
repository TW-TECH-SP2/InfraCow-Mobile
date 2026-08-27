import { View, TextInput, TouchableOpacity, Image, ScrollView, Alert, Platform, ImageSourcePropType, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import api from "../../services/api";
import Constants from "expo-constants";
import Navbar from "../../components/Navbar";

const DEFAULT_FARM_IMAGE = require("../../../assets/farm1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (image?: string | null, fallback: ImageSourcePropType = DEFAULT_FARM_IMAGE): ImageSourcePropType => {
  if (!image) return fallback;
  const normalized = String(image).trim();
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") return fallback;
  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) return { uri: normalized };
  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  return { uri: `${baseUrl}/${path}` };
};

export default function EditFarm() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const farm = route.params?.farm ?? {};
  const rawFarmId = farm.id_fazenda ?? farm.id ?? null;
  const farmId = rawFarmId !== null && /^\d+$/.test(String(rawFarmId)) ? String(rawFarmId) : null;

  const [foto, setFoto] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<any>(null);
  const [photoError, setPhotoError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [cep, setCep] = useState("");
  const [number, setNumber] = useState("");

  useEffect(() => {
    const loadFarmDetails = async () => {
      if (!farmId) {
        setName(farm.nome_fazenda ?? farm.nome ?? farm.name ?? "");
        setStreet(farm.rua ?? farm.street ?? farm.endereco ?? "");
        setNeighborhood(farm.bairro ?? farm.neighborhood ?? "");
        setCity(farm.cidade ?? farm.city ?? "");
        setCep(farm.CEP ?? farm.cep ?? "");
        setNumber(String(farm.numero ?? farm.number ?? ""));
        setFoto(farm.localImageUri ?? farm.imagem ?? farm.image ?? null);
        return;
      }
      try {
        const res = await api.get(`/fazendas/${farmId}`);
        const farmToUse = res.data?.fazenda ?? res.data ?? farm;
        setName(farmToUse.nome_fazenda ?? farmToUse.nome ?? farmToUse.name ?? "");
        setStreet(farmToUse.rua ?? farmToUse.street ?? farmToUse.endereco ?? "");
        setNeighborhood(farmToUse.bairro ?? farmToUse.neighborhood ?? "");
        setCity(farmToUse.cidade ?? farmToUse.city ?? "");
        setCep(farmToUse.CEP ?? farmToUse.cep ?? "");
        setNumber(String(farmToUse.numero ?? farmToUse.number ?? ""));
        setFoto(farmToUse.localImageUri ?? farmToUse.imagem ?? farmToUse.image ?? null);
      } catch (err) {
        setName(farm.nome_fazenda ?? farm.nome ?? farm.name ?? "");
        setStreet(farm.rua ?? farm.street ?? farm.endereco ?? "");
        setNeighborhood(farm.bairro ?? farm.neighborhood ?? "");
        setCity(farm.cidade ?? farm.city ?? "");
        setCep(farm.CEP ?? farm.cep ?? "");
        setNumber(String(farm.numero ?? farm.number ?? ""));
        setFoto(farm.localImageUri ?? farm.imagem ?? farm.image ?? null);
      }
    };

    loadFarmDetails();
  }, [farmId]);

  const abrirGaleria = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão", "Precisa liberar o acesso à galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const localImage = await saveImageLocally(asset.uri, asset.mimeType ?? 'image/jpeg');
      setFoto(localImage.localUri);
      setImageAsset({
        ...asset,
        uri: localImage.localUri,
        localUri: localImage.localUri,
        fileName: localImage.filename,
        mimeType: localImage.mimeType,
      });
      setPhotoError(false);
    }
  };

  const handleSave = async () => {
    if (!farmId) {
      Alert.alert('Erro', 'Fazenda não encontrada.');
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      if (name) form.append('nome_fazenda', name);
      if (street) form.append('rua', street);
      if (neighborhood) form.append('bairro', neighborhood);
      if (city) form.append('cidade', city);
      if (cep) form.append('CEP', cep);
      if (number) form.append('numero', number);

      if (imageAsset?.uri) {
        const uri: string = imageAsset.uri;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = filename.match(/\.(\w+)$/);
        const ext = match ? match[1] : 'jpg';
        const type = imageAsset.type ?? `image/${ext}`;

        if (Platform.OS === 'web') {
          try {
            const resp = await fetch(uri);
            const blob = await resp.blob();
            const file = new File([blob], filename, { type: blob.type || type });
            form.append('imagem', file);
          } catch (e) {
            console.warn('Could not convert image uri to blob on web', e);
          }
        } else {
          form.append('imagem', { uri, name: filename, type } as any);
        }
      }

      await api.put(`/fazendas/${farmId}`, form);
      Alert.alert('Sucesso', 'Fazenda atualizada com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);

    } catch (error: any) {
      console.error('EditFarm error:', error?.response?.status, JSON.stringify(error?.response?.data));
      Alert.alert('Erro', error?.response?.data?.message || error?.message || 'Erro inesperado ao atualizar fazenda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Image source={require("../../../assets/logoescura 1.png")} style={styles.logo} />

        <View style={styles.formContainer}>
          <Text style={styles.title}>Edição de Fazenda</Text>

          <Text style={styles.inputLabel}>Nome da fazenda:</Text>
          <TextInput style={styles.input} value={name} placeholder="Ex.: Recanto Feliz" placeholderTextColor="#D3D3D3" onChangeText={setName} editable={!loading} />

          <Text style={styles.inputLabel}>Rua:</Text>
          <TextInput style={styles.input} value={street} placeholder="Ex.:Rua 10 de Maio" placeholderTextColor="#D3D3D3" onChangeText={setStreet} editable={!loading} />

          <Text style={styles.inputLabel}>Bairro:</Text>
          <TextInput style={styles.input} value={neighborhood} placeholder="Ex.: Serrinha" placeholderTextColor="#D3D3D3" onChangeText={setNeighborhood} editable={!loading} />

          <Text style={styles.inputLabel}>Cidade:</Text>
          <TextInput style={styles.input} value={city} placeholder="Ex.: João Pessoa" placeholderTextColor="#D3D3D3" onChangeText={setCity} editable={!loading} />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>CEP:</Text>
              <TextInput style={styles.input} placeholder="Ex.: 1900-000" value={cep} placeholderTextColor="#D3D3D3" onChangeText={setCep} editable={!loading} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Número:</Text>
              <TextInput style={styles.input} placeholder="Ex.: 135" placeholderTextColor="#D3D3D3" value={number} onChangeText={setNumber} editable={!loading} />
            </View>
          </View>

          <View style={styles.photoBox}>
            <TouchableOpacity style={styles.photoLeft} onPress={abrirGaleria} disabled={loading}>
              {foto ? (
                <Image
                  source={resolveImage(foto)}
                  style={styles.photoPreview}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <Image source={require("../../../assets/camera.png")} style={styles.cameraIcon} />
              )}
            </TouchableOpacity>
            <Text style={styles.photoText}>Adicione uma foto de sua fazenda clicando na galeria.</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.buttonText}>Salvar Alterações</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Navbar />
    </View>
  );
}
