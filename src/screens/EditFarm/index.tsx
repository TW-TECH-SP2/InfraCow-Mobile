import { View, TextInput, TouchableOpacity, Image, ScrollView, Alert, ImageSourcePropType, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import Constants from "expo-constants";
import Navbar from "../../components/Navbar";
import { getFazendas, updateFazendaLocally } from "../../storage/repository";
import { enqueueOperation, updatePendingCreatePayload } from "../../storage/outbox";
import { runSync } from "../../services/syncManager";

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
  const lookupId = rawFarmId !== null && rawFarmId !== undefined && String(rawFarmId).trim() !== "" ? String(rawFarmId) : null;

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
    // Lê os dados da fazenda direto do SQLite local — funciona sem
    // internet. O registro local já tem tudo que a API retornaria (é
    // mantido sincronizado pelo pullFromServer), então não precisa mais
    // chamar /fazendas/:id.
    const applyFarmData = (source: any) => {
      setName(source.nome_fazenda ?? source.nome ?? source.name ?? "");
      setStreet(source.rua ?? source.street ?? source.endereco ?? "");
      setNeighborhood(source.bairro ?? source.neighborhood ?? "");
      setCity(source.cidade ?? source.city ?? "");
      setCep(source.CEP ?? source.cep ?? "");
      setNumber(String(source.numero ?? source.number ?? ""));
      setFoto(source.localImageUri ?? source.imagem ?? source.image ?? null);
    };

    if (!lookupId) {
      applyFarmData(farm);
      return;
    }

    try {
      const localFarms = getFazendas();
      const localFarm = localFarms.find((f: any) => String(f.id_fazenda ?? f.id ?? "") === lookupId);
      applyFarmData(localFarm ?? farm);
    } catch (err) {
      console.error('[EditFarm] Erro ao ler dados locais:', err);
      applyFarmData(farm);
    }
  }, [lookupId]);

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
    if (!lookupId) {
      Alert.alert('Erro', 'Fazenda não encontrada.');
      return;
    }

    setLoading(true);

    try {
      const patch: Record<string, any> = {};
      if (name) patch.nome_fazenda = name;
      if (street) patch.rua = street;
      if (neighborhood) patch.bairro = neighborhood;
      if (city) patch.cidade = city;
      if (cep) patch.CEP = cep;
      if (number) patch.numero = number;
      if (imageAsset?.localUri) patch.localImageUri = imageAsset.localUri;

      // Atualiza o registro local na hora — a edição aparece na tela mesmo
      // sem internet.
      updateFazendaLocally(lookupId, patch);

      if (lookupId.startsWith('local_')) {
        // Fazenda ainda não sincronizou: atualiza o payload do POST
        // pendente em vez de mandar um PUT pra um id que o servidor nem
        // conhece ainda.
        updatePendingCreatePayload(
          lookupId,
          patch,
          imageAsset?.localUri ?? undefined,
          imageAsset?.localUri ? 'imagem' : undefined
        );
      } else {
        // Já existe no servidor: enfileira um PUT.
        enqueueOperation({
          entity: 'fazenda',
          localId: lookupId,
          method: 'put',
          endpoint: `/fazendas/${lookupId}`,
          payload: patch,
          localImageUri: imageAsset?.localUri ?? null,
          imageField: imageAsset?.localUri ? 'imagem' : null,
        });
        runSync().catch((err) => console.error('[EditFarm] Erro ao sincronizar edição:', err));
      }

      Alert.alert('Sucesso', 'Fazenda atualizada. Será sincronizada automaticamente quando houver internet.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('[EditFarm] Erro ao salvar:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
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
