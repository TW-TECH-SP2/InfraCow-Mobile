import { View, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, ActivityIndicator } from "react-native";
import { saveImageLocally } from "../../services/imageStorage";
import auth from "../../services/auth";
import cache from "../../services/cache";
import offlineSync from "../../services/offlineSync";


export default function RegisterFarm() {
  const navigation = useNavigation();
  const [foto, setFoto] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<any>(null);

  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [cep, setCep] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

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
    }
  };

  const handleRegister = async () => {
    console.log('[RegisterFarm] handleRegister started');
    
    if (!name || !street || !neighborhood || !city || !cep || !number) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      console.log('[RegisterFarm] getting user...');
      const currentUser = await auth.getLoggedUser();
      const idUsuario = currentUser?.id_usuario ?? currentUser?.idUsuario ?? currentUser?.usuario_id;

      if (!idUsuario) {
        Alert.alert('Sessão inválida', 'Faça login novamente.');
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append('nome_fazenda', name);
      form.append('rua', street);
      form.append('bairro', neighborhood);
      form.append('cidade', city);
      form.append('CEP', cep);
      form.append('numero', String(number));

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
            // @ts-ignore
            form.append('imagem', file);
          } catch (e) {
            console.warn('[RegisterFarm] Could not convert image uri to blob on web', e);
          }
        } else {
          // @ts-ignore
          form.append('imagem', { uri, name: filename, type });
        }
      }

      const clientTempId = `farm_${Date.now()}`;

      const result = await offlineSync.optimisticUpdate({
        endpoint: '/fazendas',
        method: 'post',
        data: {
          nome_fazenda: name,
          rua: street,
          bairro: neighborhood,
          cidade: city,
          CEP: cep,
          numero: number,
          _localImageUri: imageAsset?.localUri ?? null,
          _filename: imageAsset?.fileName ?? null,
          _mimetype: imageAsset?.mimeType ?? null,
        },
        cacheKey: '/fazendas',
        formData: form,
        clientTempId,
        onOptimisticUpdate: async (farmData) => {
          const optimisticFarm = {
            id_fazenda: clientTempId,
            clientTempId,
            pendingSync: true,
            ...farmData,
            localImageUri: imageAsset?.localUri ?? null,
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
            ...cachedFarms.filter((f: any) => String(f.id_fazenda ?? f.id) !== clientTempId),
            optimisticFarm,
          ];

          await cache.setCache('/fazendas', updated);
          console.log('[RegisterFarm] Optimistic update done');
        },
        onSuccess: async () => {
          Alert.alert('Sucesso', 'Fazenda cadastrada com sucesso.');
        },
        onError: (error) => {
          const message = error?.response?.data?.message || error?.message || 'Erro ao cadastrar fazenda';
          console.error('[RegisterFarm] Error:', message);
          Alert.alert('Erro', message);
        },
      });

      console.log('[RegisterFarm] Result:', {
        offline: result.offline,
        queued: result.queued,
      });

      setTimeout(() => {
        navigation.goBack();
      }, 500);

    } catch (error: any) {
      console.error('[RegisterFarm] Unexpected error:', error);
      Alert.alert('Erro', 'Erro inesperado ao cadastrar fazenda');
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Image
          source={require("../../../assets/logoescura 1.png")}
          style={styles.logo}
        />

        <View style={styles.formContainer}>
          <Text style={styles.title}>Cadastro de Fazenda</Text>
          <Text style={styles.inputLabel}>Nome da fazenda:</Text>
          <TextInput
            style={styles.input}
            value={name}
            placeholder="Ex.: Recanto Feliz"
            placeholderTextColor="#D3D3D3"
            onChangeText={setName}
            editable={!loading}
          />
          <Text style={styles.inputLabel}>Rua:</Text>
          <TextInput
            style={styles.input}
            value={street}
            placeholder="Ex.:Rua 10 de Maio"
            placeholderTextColor="#D3D3D3"
            onChangeText={setStreet}
            editable={!loading}
          />
          <Text style={styles.inputLabel}>Bairro:</Text>
          <TextInput
            style={styles.input}
            value={neighborhood}
            placeholder="Ex.: Serrinha"
            placeholderTextColor="#D3D3D3"
            onChangeText={setNeighborhood}
            editable={!loading}
          />
          <Text style={styles.inputLabel}>Cidade:</Text>
          <TextInput
            style={styles.input}
            value={city}
            placeholder="Ex.: João Pessoa"
            placeholderTextColor="#D3D3D3"
            onChangeText={setCity}
            editable={!loading}
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
                editable={!loading}
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
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.photoBox}>
            <TouchableOpacity style={styles.photoLeft} onPress={abrirGaleria} disabled={loading}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.photoPreview} />
              ) : (
                <Image
                  source={require("../../../assets/camera.png")}
                  style={styles.cameraIcon}
                />
              )}
            </TouchableOpacity>

            <Text style={styles.photoText}>
              Adicione uma foto de sua fazenda clicando na câmera.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, { opacity: loading ? 0.6 : 1 }]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Cadastrar Fazenda</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}