import { 
  View, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Text,
} from "react-native";
import { useEffect, useState } from "react";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import auth from "../../services/auth";
import { saveImageLocally } from "../../services/imageStorage";
import offlineSync from "../../services/offlineSync";
import cache from "../../services/cache";
import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? 'https://infracow-api-hv24.onrender.com';
};

const resolveUserPhoto = (photo?: string | null) => {
  if (!photo) return null;

  const normalized = String(photo).trim();
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
    return null;
  }

  if (/^(file:|blob:|data:)/i.test(normalized)) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const clean = normalized.replace(/^\/+/, '').replace(/\\/g, '/');
  const path = clean.startsWith('uploads/') ? clean : `uploads/${clean}`;
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  return `${baseUrl}/${path}`;
};


export default function EditScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await auth.getUser();
      if (user) {
        setName(user.nome ?? "");
        setEmail(user.email ?? "");
        const userPhoto = resolveUserPhoto(user.localImageUri ?? user.imagem ?? user.foto ?? user.imageUrl ?? null);
        setFoto(userPhoto);
      }
    };
    loadUser();
  }, []);


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

  const handleUpdate = async () => {
    if (!name || !email) {
      Alert.alert("Campos obrigatórios", "Nome e email são obrigatórios.");
      return;
    }

    if (password && password !== confirm) {
      Alert.alert("Senha", "As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      const currentUser = await auth.getUser();
      if (!currentUser?.id_usuario) {
        Alert.alert("Erro", "Sessão inválida. Faça login novamente.");
        return;
      }

      const form = new FormData();
      form.append('nome', name);
      form.append('email', email);
      if (password) form.append('password', password);

      if (imageAsset?.uri) {
        const uri: string = imageAsset.uri;
        const filename = uri.split('/').pop() || 'profile.jpg';
        const match = filename.match(/\.(\w+)$/);
        const ext = match ? match[1] : 'jpg';
        const type = imageAsset.type ?? `image/${ext}`;

        try {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const file = new File([blob], filename, { type: blob.type || type });
          // @ts-ignore
          form.append('imagem', file);
        } catch (e) {
          console.warn('Could not convert image uri to blob', e);
        }
      }

      const clientTempId = `user_edit_${currentUser.id_usuario}_${Date.now()}`;

      await offlineSync.optimisticUpdate({
        endpoint: '/perfil',
        method: 'put',
        data: {
          nome: name,
          email: email,
          password: password || undefined,
        },
        cacheKey: '/perfil',
        formData: form,
        clientTempId,
        onOptimisticUpdate: async (updatedData) => {
          const optimisticUser = {
            ...currentUser,
            ...updatedData,
            localImageUri: imageAsset?.localUri ?? foto ?? null,
          };
          await cache.setCache('/perfil', optimisticUser);
        },
        onSuccess: async () => {
          Alert.alert("Sucesso", "Perfil atualizado com sucesso.");
        },
        onError: (error) => {
          const message = error?.response?.data?.message || error?.message || "Falha ao atualizar perfil";
          console.error('EditUser Error:', message);
          Alert.alert("Erro", message);
        },
      });

      setTimeout(() => {
        navigation.goBack();
      }, 500);

    } catch (error: any) {
      console.error('EditUser Unexpected error:', error);
      Alert.alert("Erro", "Erro inesperado ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };


return (
  <ScrollView
    contentContainerStyle={styles.container}
    showsVerticalScrollIndicator={false}
  >
    <Image
      source={require("../../../assets/back-fomuser.png")}
      style={styles.backgroundformuser}
    />

    <View style={styles.rowlogo}>
      <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
        <Image
          source={require("../../../assets/back-light.png")}
          style={styles.voltar}
        />
      </TouchableOpacity>
    </View>

    <View style={styles.form}>
      <Text style={styles.title}>Edite seu perfil</Text>

      <Text style={styles.legendacampo}>Nome completo</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor="#ccc"
      />

      <Text style={styles.legendacampo}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#ccc"
      />

      <Text style={styles.legendacampo}>Senha</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholderTextColor="#ccc"
        secureTextEntry
      />

      <Text style={styles.legendacampo}>Confirme sua senha</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        placeholderTextColor="#ccc"
        secureTextEntry
      />

      <View style={styles.photoBox}>
        <TouchableOpacity
          style={styles.photoLeft}
          onPress={abrirGaleria}
        >
          {foto ? (
            <Image
              source={{ uri: foto }}
              style={styles.photoPreview}
            />
          ) : (
            <Image
              source={require("../../../assets/camera.png")}
              style={styles.cameraIcon}
            />
          )}
        </TouchableOpacity>

        <Text style={styles.photoText}>
          Toque na caixa para selecionar uma foto.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);
}