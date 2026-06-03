import { View, TextInput, TouchableOpacity, Image, ScrollView, Alert, Platform, ImageSourcePropType, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import cache from "../../services/cache";
import auth from "../../services/auth";
import offlineSync from "../../services/offlineSync";
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
  if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
    return fallback;
  }

  if (/^https?:\/\//i.test(normalized) || /^(file:|blob:|data:)/i.test(normalized)) {
    return { uri: normalized };
  }

  const clean = normalized.replace(/^\/+/, "").replace(/\\/g, "/");
  const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  return { uri: `${baseUrl}/${path}` };
};

export default function EditFarm() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const farm = route.params?.farm ?? {};
  const farmId = farm.id_fazenda ?? farm.id ?? null;

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
      console.log('[EditFarm] farm data received:', farm);
      
      let farmToUse = farm;
      
      if (farmId && (!farm.rua && !farm.bairro && !farm.cidade && !farm.CEP && !farm.numero)) {
        try {
          console.log('[EditFarm] Buscando dados completos da fazenda no cache...');
          const cached = await cache.getCache('/fazendas');
          const cachedFarms = Array.isArray(cached)
            ? cached
            : Array.isArray(cached?.fazendas)
              ? cached.fazendas
              : [];
          
          const cachedFarm = cachedFarms.find((f: any) => String(f.id_fazenda ?? f.id) === String(farmId));
          if (cachedFarm) {
            console.log('[EditFarm] Dados encontrados no cache:', cachedFarm);
            farmToUse = { ...farm, ...cachedFarm };
          }
        } catch (err) {
          console.warn('[EditFarm] Erro ao buscar cache:', err);
        }
        
        if (!farmToUse.rua && !farmToUse.bairro && !farmToUse.cidade) {
          try {
            console.log('[EditFarm] Buscando dados completos da fazenda via API...');
            const res = await api.get(`/fazendas/${farmId}`);
            const farmDetails = res.data?.fazenda ?? res.data;
            if (farmDetails) {
              farmToUse = { ...farm, ...farmDetails };
              
              const cached = await cache.getCache('/fazendas');
              const cachedFarms = Array.isArray(cached)
                ? cached
                : Array.isArray(cached?.fazendas)
                  ? cached.fazendas
                  : [];
              const updatedFarms = cachedFarms
                .filter((f: any) => String(f.id_fazenda ?? f.id) !== String(farmId))
                .concat([farmDetails]);
              await cache.setCache('/fazendas', updatedFarms);
              console.log('[EditFarm] Dados salvos no cache');
            }
          } catch (err) {
            console.warn('[EditFarm] Erro ao buscar API:', err);
          }
        }
      }
      
      if (farmToUse && Object.keys(farmToUse).length > 0) {
        setName(farmToUse.nome_fazenda ?? farmToUse.nome ?? farmToUse.name ?? "");
        setStreet(farmToUse.rua ?? farmToUse.street ?? farmToUse.endereco ?? "");
        setNeighborhood(farmToUse.bairro ?? farmToUse.neighborhood ?? "");
        setCity(farmToUse.cidade ?? farmToUse.city ?? "");
        setCep(farmToUse.CEP ?? farmToUse.cep ?? "");
        setNumber(farmToUse.numero ?? farmToUse.number ?? "");
        setFoto(farmToUse.localImageUri ?? farmToUse.imagem ?? farmToUse.image ?? null);
        
        console.log('[EditFarm] fields loaded:', {
          name: farmToUse.nome_fazenda ?? farmToUse.nome ?? farmToUse.name,
          street: farmToUse.rua ?? farmToUse.street ?? farmToUse.endereco,
          neighborhood: farmToUse.bairro ?? farmToUse.neighborhood,
          city: farmToUse.cidade ?? farmToUse.city,
          cep: farmToUse.CEP ?? farmToUse.cep,
          number: farmToUse.numero ?? farmToUse.number,
        });
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
      const currentUser = await auth.getLoggedUser();

      if (!currentUser?.id_usuario) {
        Alert.alert('Sessão inválida', 'Faça login novamente.');
        return;
      }

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
          form.append('imagem', { uri, name: filename, type });
        }
      }

      const clientTempId = `farm_edit_${farmId}_${Date.now()}`;

      await offlineSync.optimisticUpdate({
        endpoint: `/fazendas/${farmId}`,
        method: 'put',
        data: {
          nome_fazenda: name,
          rua: street,
          bairro: neighborhood,
          cidade: city,
          CEP: cep,
          numero: number,
        },
        cacheKey: '/fazendas',
        formData: form,
        clientTempId,
        onOptimisticUpdate: async (updatedData) => {
          const optimisticFarm = {
            ...farm,
            ...updatedData,
            localImageUri: imageAsset?.localUri ?? foto ?? null,
          };

          const cachedFarmsRaw = await cache.getCache('/fazendas');
          const cachedFarms = Array.isArray(cachedFarmsRaw)
            ? cachedFarmsRaw
            : Array.isArray(cachedFarmsRaw?.fazendas)
              ? cachedFarmsRaw.fazendas
              : Array.isArray(cachedFarmsRaw?.data)
                ? cachedFarmsRaw.data
                : [];

          const updated = [
            ...cachedFarms.filter((f: any) => String(f.id_fazenda ?? f.id) !== String(farmId)),
            optimisticFarm,
          ];

          await cache.setCache('/fazendas', updated);
        },
        onSuccess: async () => {
          Alert.alert('Sucesso', 'Fazenda atualizada com sucesso.');
        },
        onError: (error) => {
          const message = error?.response?.data?.message || error?.message || 'Erro ao atualizar fazenda';
          console.error('EditFarm Error:', message);
          Alert.alert('Erro', message);
        },
      });

      setTimeout(() => {
        navigation.goBack();
      }, 500);

    } catch (error: any) {
      console.error('EditFarm Unexpected error:', error);
      Alert.alert('Erro', 'Erro inesperado ao atualizar fazenda');
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
        {/* HEADER */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Image
          source={require("../../../assets/logoescura 1.png")}
          style={styles.logo}
        />

        <View style={styles.formContainer}>
          <Text style={styles.title}>Edição de Fazenda</Text>
          <Text style={styles.inputLabel}>Nome da fazenda:</Text>
          <TextInput
            style={styles.input}
            value={name}
            placeholder="Ex.: Recanto Feliz"
            placeholderTextColor="#D3D3D3"
            onChangeText={setName}
          />
          <Text style={styles.inputLabel}>Rua:</Text>
          <TextInput
            style={styles.input}
            value={street}
            placeholder="Ex.:Rua 10 de Maio"
            placeholderTextColor="#D3D3D3"
            onChangeText={setStreet}
          />
          <Text style={styles.inputLabel}>Bairro:</Text>
          <TextInput
            style={styles.input}
            value={neighborhood}
            placeholder="Ex.: Serrinha"
            placeholderTextColor="#D3D3D3"
            onChangeText={setNeighborhood}
          />
          <Text style={styles.inputLabel}>Cidade:</Text>
          <TextInput
            style={styles.input}
            value={city}
            placeholder="Ex.: João Pessoa"
            placeholderTextColor="#D3D3D3"
            onChangeText={setCity}
          />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>CEP:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 1900-000"
                value={cep}
                placeholderTextColor="#D3D3D3"
                onChangeText={setCep}
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Número:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 135"
                placeholderTextColor="#D3D3D3"
                value={number}
                onChangeText={setNumber}
              />
            </View>
          </View>

          {/* FOTO */}
          <View style={styles.photoBox}>
            <TouchableOpacity 
              style={styles.photoLeft} 
              onPress={abrirGaleria}
              disabled={loading}
            >
              {foto ? (
                <Image 
                  source={resolveImage(foto)} 
                  style={styles.photoPreview}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <Image
                  source={require("../../../assets/camera.png")}
                  style={styles.cameraIcon}
                />
              )}
            </TouchableOpacity>

            <Text style={styles.photoText}>
              Adicione uma foto de sua fazenda clicando na galeria.
            </Text>
          </View>

          {/* BOTÃO */}
          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* NAVBAR */}
      <Navbar  />
    </View>
  );
}