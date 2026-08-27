import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Text,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import auth from "../../services/auth";
import api from "../../services/api";
import { saveImageLocally } from "../../services/imageStorage";
import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? 'https://infracow-api-hv24.onrender.com';
};

const resolveUserPhoto = (photo?: string | null) => {
  if (!photo) return null;
  const normalized = String(photo).trim();
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') return null;
  if (/^(file:|blob:|data:)/i.test(normalized)) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const clean = normalized.replace(/^\/+/, '').replace(/\\/g, '/');
  const path = clean.startsWith('uploads/') ? clean : `uploads/${clean}`;
  return `${getApiBaseUrl().replace(/\/$/, '')}/${path}`;
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
        const raw = user.localImageUri ?? user.imagem ?? user.foto ?? user.imageUrl ?? null;
        const resolved = user.localImageUri ? user.localImageUri : resolveUserPhoto(raw);
        setFoto(resolved);
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
      const form = new FormData();
      form.append('nome', name);
      form.append('email', email);
      if (password) form.append('senha', password);

      if (imageAsset?.uri) {
        const uri: string = imageAsset.uri;
        const filename = imageAsset.fileName ?? uri.split('/').pop() ?? 'photo.jpg';
        const mimeType = imageAsset.mimeType ?? 'image/jpeg';

        if (Platform.OS === 'web') {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const file = new File([blob], filename, { type: blob.type || mimeType });
          form.append('imagem', file);
        } else {
          form.append('imagem', { uri, name: filename, type: mimeType });
        }
      }

      const res = await api.put('/perfil', form);

      const usuarioAtualizado = res.data?.usuario;
      if (usuarioAtualizado) {
        const currentUser = await auth.getUser();
        await auth.saveUserData({
          ...(currentUser ?? {}),
          nome: usuarioAtualizado.nome ?? name,
          email: usuarioAtualizado.email ?? email,
          imagem: usuarioAtualizado.imagem ?? currentUser?.imagem ?? null,
          localImageUri: imageAsset?.localUri ?? currentUser?.localImageUri ?? null,
        });
      }

      Alert.alert("Sucesso", "Perfil atualizado com sucesso.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? "Falha ao atualizar perfil";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={require("../../../assets/back-fomuser.png")} style={styles.backgroundformuser} />

      <View style={styles.rowlogo}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Image source={require("../../../assets/back-light.png")} style={styles.voltar} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Edite seu perfil</Text>

        <Text style={styles.legendacampo}>Nome completo</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#ccc" />

        <Text style={styles.legendacampo}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#ccc" />

        <Text style={styles.legendacampo}>Nova senha (opcional)</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholderTextColor="#ccc" secureTextEntry />

        <Text style={styles.legendacampo}>Confirme a nova senha</Text>
        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholderTextColor="#ccc" secureTextEntry />

        <View style={styles.photoBox}>
          <TouchableOpacity style={styles.photoLeft} onPress={abrirGaleria}>
            {foto
              ? <Image source={{ uri: foto }} style={styles.photoPreview} />
              : <Image source={require("../../../assets/camera.png")} style={styles.cameraIcon} />
            }
          </TouchableOpacity>
          <Text style={styles.photoText}>Toque na caixa para selecionar uma foto.</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Atualizando..." : "Atualizar"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
