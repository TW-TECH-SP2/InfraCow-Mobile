import { View, TextInput, TouchableOpacity, Image, ScrollView, Alert, Platform, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import { generateLocalId, saveFazendaLocally } from "../../storage/repository";
import { enqueueOperation } from "../../storage/outbox";
import { runSync } from "../../services/syncManager";

export default function RegisterFarm() {
  const navigation = useNavigation<any>();
  const [foto, setFoto] = useState<string | null>(null);
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
      setFoto(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    if (!name || !street || !neighborhood || !city || !cep || !number) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos');
      return;
    }

    const numeroInt = parseInt(number, 10);
    if (isNaN(numeroInt)) {
      Alert.alert('Erro', 'O número da fazenda deve ser um valor numérico válido');
      return;
    }

    setLoading(true);

    try {
      // Copia a foto (se houver) pra um diretório persistente do app.
      // A uri que vem do ImagePicker é de cache e pode sumir antes de
      // sincronizarmos — sem isso, uma fazenda cadastrada offline hoje
      // pode perder a foto quando o outbox tentar enviá-la mais tarde.
      let localImageUri: string | null = null;
      if (foto && Platform.OS !== 'web') {
        try {
          const savedImage = await saveImageLocally(foto, 'image/jpeg');
          localImageUri = savedImage.localUri;
        } catch {
          localImageUri = foto;
        }
      }

      const fazendaPayload = {
        nome_fazenda: name,
        rua: street,
        bairro: neighborhood,
        cidade: city,
        CEP: cep,
        numero: numeroInt,
      };

      // 1) Gera um id local e grava na SQLite na hora — a fazenda já existe
      //    pro resto do app (Farm, Herd, seleção de fazenda) mesmo sem rede.
      const localId = generateLocalId('fazenda');
      saveFazendaLocally(fazendaPayload, localId);

      // 2) Enfileira a operação real (POST /fazendas) pro outbox. Quando
      //    sincronizar, o id local vira o id_fazenda definitivo do servidor
      //    (replaceLocalFazendaId, já existente no repository).
      enqueueOperation({
        entity: 'fazenda',
        localId,
        method: 'post',
        endpoint: '/fazendas',
        payload: fazendaPayload,
        localImageUri,
        imageField: 'imagem',
      });

      // 3) Tenta sincronizar imediatamente em segundo plano. Se não houver
      //    internet, runSync simplesmente não faz nada e a fila fica pra
      //    depois — não bloqueia a navegação do usuário.
      runSync();

      const localFarm = { ...fazendaPayload, id_fazenda: localId, imagem: localImageUri ?? null };

      Alert.alert('Sucesso', 'Fazenda cadastrada! Será sincronizada automaticamente quando houver internet.');
      navigation.navigate('Farm', { farm: localFarm });
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Image source={require("../../../assets/logoescura 1.png")} style={styles.logo} />

        <View style={styles.formContainer}>
          <Text style={styles.title}>Cadastro de Fazenda</Text>

          <Text style={styles.inputLabel}>Nome da fazenda: *</Text>
          <TextInput style={styles.input} value={name} placeholder="Ex.: Recanto Feliz" placeholderTextColor="#D3D3D3" onChangeText={setName} />

          <Text style={styles.inputLabel}>Rua: *</Text>
          <TextInput style={styles.input} value={street} placeholder="Ex.: Rua 10 de Maio" placeholderTextColor="#D3D3D3" onChangeText={setStreet} />

          <Text style={styles.inputLabel}>Bairro: *</Text>
          <TextInput style={styles.input} value={neighborhood} placeholder="Ex.: Serrinha" placeholderTextColor="#D3D3D3" onChangeText={setNeighborhood} />

          <Text style={styles.inputLabel}>Cidade: *</Text>
          <TextInput style={styles.input} value={city} placeholder="Ex.: João Pessoa" placeholderTextColor="#D3D3D3" onChangeText={setCity} />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>CEP: *</Text>
              <TextInput style={styles.input} placeholder="Ex.: 58000-000" value={cep} placeholderTextColor="#D3D3D3" onChangeText={setCep} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Número: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 135"
                placeholderTextColor="#D3D3D3"
                value={number}
                onChangeText={setNumber}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.photoBox}>
            <TouchableOpacity style={styles.photoLeft} onPress={abrirGaleria}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.photoPreview} />
              ) : (
                <Image source={require("../../../assets/camera.png")} style={styles.cameraIcon} />
              )}
            </TouchableOpacity>
            <Text style={styles.photoText}>Adicione uma foto de sua fazenda clicando na câmera.</Text>
          </View>

          <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Cadastrar Fazenda</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
