import { View, TextInput, TouchableOpacity, Image, ScrollView, ImageSourcePropType, Alert, Platform, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import api from "../../services/api";
import Constants from "expo-constants";
import Navbar from "../../components/Navbar";

const DEFAULT_ANIMAL_IMAGE = require("../../../assets/cow1.png");

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? "https://infracow-api-hv24.onrender.com";
};

const resolveImage = (image?: string | null, fallback: ImageSourcePropType = DEFAULT_ANIMAL_IMAGE): ImageSourcePropType => {
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

export default function EditAnimal() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const animal = route.params?.animal ?? {};
  const animalId = animal.id_animal ?? animal.id ?? null;
  const farmId = animal.id_fazenda ?? null;

  const [foto, setFoto] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<any>(null);
  const [photoError, setPhotoError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [codigo, setCodigo] = useState("");
  const [raca, setRaca] = useState("");
  const [peso, setPeso] = useState("");
  const [idade, setIdade] = useState("");

  const [openGenero, setOpenGenero] = useState(false);
  const [genero, setGenero] = useState("");

  const [openTipo, setOpenTipo] = useState(false);
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    if (animal) {
      setName(animal.nome_animal ?? animal.nome ?? "");
      setCodigo(animal.codigo ?? "");
      setRaca(animal.raca ?? "");
      setPeso(String(animal.peso ?? ""));
      setIdade(String(animal.idade ?? ""));
      setGenero(animal.genero ?? "");
      setTipo(animal.tipo ?? "");
      setFoto(animal.localImageUri ?? animal.imagem ?? animal.image ?? null);
    }
  }, [animal]);

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
    if (!animalId || !farmId) {
      Alert.alert('Erro', 'Animal ou fazenda não encontrados.');
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      if (name) form.append('nome_animal', name);
      if (codigo) form.append('codigo', codigo);
      if (genero) form.append('genero', genero);
      if (tipo) form.append('tipo', tipo);
      if (raca) form.append('raca', raca);
      if (peso) form.append('peso', String(peso));
      if (idade) form.append('idade', String(idade));

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

      await api.put(`/animais/${animalId}`, form);
      Alert.alert('Sucesso', 'Animal atualizado com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);

    } catch (error: any) {
      console.error('EditAnimal Unexpected error:', error);
      Alert.alert('Erro', error?.response?.data?.message || error?.message || 'Erro inesperado ao atualizar animal');
    } finally {
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
          <Text style={styles.title}>Edição de Animal</Text>
          <Text style={styles.inputLabel}>Nome do animal:</Text>
          <TextInput
            style={styles.input}
            value={name}
            placeholder="Ex.: Mimosa"
            placeholderTextColor="#D3D3D3"
            onChangeText={setName}
          />
          <Text style={styles.inputLabel}>Código (opcional):</Text>
          <TextInput
            style={styles.input}
            value={codigo}
            placeholder="Ex.: 12345 (opcional)"
            placeholderTextColor="#D3D3D3"
            onChangeText={setCodigo}
          />
          <Text style={styles.inputLabel}>Gênero:</Text>
          <View style={styles.selectWrapper}>

            <TouchableOpacity
              style={[styles.select, openGenero && styles.selectOpen]}
              onPress={() => {
                setOpenGenero(!openGenero);
                setOpenTipo(false);
              }}
            >
              <Text style={styles.selectText}>
                {genero ? genero : "Selecione o gênero"}
              </Text>

              <Image
                source={require("../../../assets/arrow-down.png")}
                style={styles.arrowselect}
              />
            </TouchableOpacity>

            {openGenero && (
              <View style={styles.dropdown}>
                {["Fêmea", "Macho"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.option}
                    onPress={() => {
                      setGenero(item);
                      setOpenGenero(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </View>
          <Text style={styles.inputLabel}>Tipo:</Text>
          <View style={styles.selectWrapper}>

            <TouchableOpacity
              style={[styles.select, openTipo && styles.selectOpen]}
              onPress={() => {
                setOpenTipo(!openTipo);
                setOpenGenero(false);
              }}
            >
              <Text style={styles.selectText}>
                {tipo ? tipo : "Selecione o tipo"}
              </Text>

              <Image
                source={require("../../../assets/arrow-down.png")}
                style={styles.arrowselect}
              />
            </TouchableOpacity>

            {openTipo && (
              <View style={styles.dropdown}>
                {["Leiteira", "Corte", "Mista"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.option}
                    onPress={() => {
                      setTipo(item);
                      setOpenTipo(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </View>
          <Text style={styles.inputLabel}>Raça:</Text>
          <TextInput
            style={styles.input}
            value={raca}
            placeholder="Ex.: Holandesa"
            placeholderTextColor="#D3D3D3"
            onChangeText={setRaca}
          />
          <View style={styles.row}>

            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Peso(kg):</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 600"
                value={peso}
                placeholderTextColor="#D3D3D3"
                onChangeText={setPeso}
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Idade (anos):</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 2"
                placeholderTextColor="#D3D3D3"
                value={idade}
                onChangeText={setIdade}
              />
            </View>

          </View>

          <View style={styles.photoBox}>

            <TouchableOpacity style={styles.photoLeft} onPress={abrirGaleria}>
              {foto && !photoError ? (
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
              Adicione uma foto do animal clicando na câmera.
            </Text>

          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Salvando..." : "Salvar alterações"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}