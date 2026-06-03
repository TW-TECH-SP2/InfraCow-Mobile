import { View, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import cache from "../../services/cache";
import auth from "../../services/auth";
import offlineSync from "../../services/offlineSync";
import { Alert, Platform, ActivityIndicator } from 'react-native';

export default function RegisterAnimal() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [foto, setFoto] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<any>(null);
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
    if (!name || !genero || !tipo || !raca || !peso || !idade) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      const currentUser = await auth.getLoggedUser();
      const farmId = route.params?.farm?.id_fazenda ?? route.params?.farm?.id ?? null;

      if (!currentUser?.id_usuario) {
        Alert.alert('Sessão inválida', 'Faça login novamente.');
        return;
      }

      if (!farmId) {
        Alert.alert('Erro', 'Nenhuma fazenda foi selecionada.');
        return;
      }

      const form = new FormData();
      form.append('nome_animal', name);
      if (codigo) {
        form.append('codigo', codigo);
      }
      form.append('genero', genero);
      form.append('tipo', tipo);
      form.append('raca', raca);
      form.append('peso', String(peso));
      form.append('idade', String(idade));
      form.append('id_fazenda', farmId);

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
            console.warn('Could not convert image uri to blob on web', e);
          }
        } else {
          // @ts-ignore
          form.append('imagem', { uri, name: filename, type });
        }
      }

      const clientTempId = `animal_${Date.now()}`;

      const result = await offlineSync.optimisticUpdate({
        endpoint: '/animais',
        method: 'post',
        data: {
          nome_animal: name,
          codigo: codigo || null,
          genero,
          tipo,
          raca,
          peso: String(peso),
          idade: String(idade),
          id_fazenda: farmId,
        },
        cacheKey: '/animais',
        formData: form,
        clientTempId,
        onOptimisticUpdate: async (animalData) => {
          const optimisticAnimal = {
            id_animal: clientTempId,
            clientTempId,
            pendingSync: true,
            ...animalData,
            localImageUri: imageAsset?.localUri ?? null,
          };

          const cachedAnimalsRaw = await cache.getCache('/animais');
          const cachedAnimals = Array.isArray(cachedAnimalsRaw)
            ? cachedAnimalsRaw
            : Array.isArray(cachedAnimalsRaw?.animais)
              ? cachedAnimalsRaw.animais
              : Array.isArray(cachedAnimalsRaw?.data)
                ? cachedAnimalsRaw.data
                : [];

          const updated = [
            ...cachedAnimals.filter((a: any) => String(a.id_animal ?? a.id) !== clientTempId),
            optimisticAnimal,
          ];

          await cache.setCache('/animais', updated);
        },
        onSuccess: async () => {
          Alert.alert('Sucesso', 'Animal cadastrado com sucesso.');
        },
        onError: (error) => {
          const message = error?.response?.data?.message || error?.message || 'Erro ao cadastrar animal';
          console.error('RegisterAnimal Error:', message);
          Alert.alert('Erro', message);
        },
      });

      setTimeout(() => {
        navigation.goBack();
      }, 500);

    } catch (error: any) {
      console.error('RegisterAnimal Unexpected error:', error);
      Alert.alert('Erro', 'Erro inesperado ao cadastrar animal');
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
      
      {/* HEADER */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <Image
        source={require("../../../assets/logoescura 1.png")}
        style={styles.logo}
      />

      <View style={styles.formContainer}>
        <Text style={styles.title}>Cadastro de Animal</Text>
        <Text style={styles.inputLabel}>Nome do animal:</Text>
        <TextInput
          style={styles.input}
          value={name}
          placeholder="Ex.: Mimosa"
          placeholderTextColor="#D3D3D3"
          onChangeText={setName}
          editable={!loading}
        />
        <Text style={styles.inputLabel}>Código (opcional):</Text>
        <TextInput
          style={styles.input}
          value={codigo}
          placeholder="Ex.: 12345 (opcional)"
          placeholderTextColor="#D3D3D3"
          onChangeText={setCodigo}
          editable={!loading}
        />
        <Text style={styles.inputLabel}>Gênero:</Text>
        <View style={styles.selectWrapper}>

          <TouchableOpacity
            style={[styles.select, openGenero && styles.selectOpen]}
            onPress={() => {
              if (!loading) {
                setOpenGenero(!openGenero);
                setOpenTipo(false);
              }
            }}
            disabled={loading}
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
              if (!loading) {
                setOpenTipo(!openTipo);
                setOpenGenero(false);
              }
            }}
            disabled={loading}
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
          editable={!loading}
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
            editable={!loading}
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
            editable={!loading}
            />
        </View>

        </View>

        {/* FOTO */}
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
            Adicione uma foto do animal clicando na câmera.
        </Text>

        </View>

        {/* BOTÃO */}
        <TouchableOpacity 
          style={[styles.button, { opacity: loading ? 0.6 : 1 }]} 
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Cadastrar Animal</Text>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </ScrollView>
  );
}