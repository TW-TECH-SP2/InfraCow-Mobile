import { View, TextInput, TouchableOpacity, Image, ScrollView, Alert, Platform, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import api from "../../services/api";

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
    // Valida campos
    if (!name || !street || !neighborhood || !city || !cep || !number) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos');
      return;
    }

    // Valida e converte número
    const numeroInt = parseInt(number, 10);
    if (isNaN(numeroInt)) {
      Alert.alert('Erro', 'O número da fazenda deve ser um valor numérico válido');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nome_fazenda', name);
      formData.append('rua', street);
      formData.append('bairro', neighborhood);
      formData.append('cidade', city);
      formData.append('CEP', cep);
      formData.append('numero', String(numeroInt));

      if (foto && Platform.OS !== 'web') {
        const filename = foto.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        (formData as any).append('imagem', {
          uri: foto,
          name: filename,
          type: type,
        });
      }

      const response = await api.post('/fazendas', formData);
      const createdFarm = response.data?.fazenda ?? response.data;
      
      if (createdFarm?.id_fazenda) {
        Alert.alert('Sucesso', 'Fazenda cadastrada!');
        navigation.navigate('Farm', { farm: createdFarm });
      } else {
        throw new Error('ID não retornado');
      }
      
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.message || error?.message || 'Erro ao cadastrar');
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
                keyboardType="numeric"  // <--- ADICIONA TECLADO NUMÉRICO
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