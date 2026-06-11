import { View, TextInput, TouchableOpacity, Image, ScrollView, Alert, Platform, ActivityIndicator } from "react-native";
import Text from "../../components/Text";
import { useState, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "./styles";
import * as ImagePicker from 'expo-image-picker';
import { saveImageLocally } from "../../services/imageStorage";
import api from "../../services/api";

const gerarCodigoAleatorio = () => {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `SC-${num}`;
};

export default function RegisterAnimal() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [foto, setFoto] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [codigo, setCodigo] = useState("");
  // codigoVeioDaTag controla se o campo código fica visível
  const [codigoVeioDaTag, setCodigoVeioDaTag] = useState(false);
  const [raca, setRaca] = useState("");
  const [peso, setPeso] = useState("");
  const [idade, setIdade] = useState("");
  const [openGenero, setOpenGenero] = useState(false);
  const [genero, setGenero] = useState("");
  const [openTipo, setOpenTipo] = useState(false);
  const [tipo, setTipo] = useState("");

  const routeFarm = route.params?.farm;
  const farmIdValue = routeFarm?.id_fazenda ?? routeFarm?.id ?? null;
  const farmId = farmIdValue !== null && farmIdValue !== undefined && String(farmIdValue).trim() !== ''
    ? String(farmIdValue)
    : '';
  const farmName = routeFarm?.nome_fazenda ?? routeFarm?.name ?? '';

  // Quando voltar da leitura NFC, preenche o código e mostra o campo
  useEffect(() => {
    if (route.params?.rfidCode) {
      setCodigo(route.params.rfidCode);
      setCodigoVeioDaTag(true);
    }
  }, [route.params?.rfidCode]);

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
      try {
        const localImage = await saveImageLocally(asset.uri, asset.mimeType ?? 'image/jpeg');
        setFoto(localImage.localUri);
        setImageAsset({
          ...asset,
          uri: localImage.localUri,
          localUri: localImage.localUri,
          fileName: localImage.filename,
          mimeType: localImage.mimeType,
        });
      } catch {
        setFoto(asset.uri);
        setImageAsset({ ...asset, localUri: asset.uri });
      }
    }
  };

  const lerTagNfc = () => {
    navigation.navigate('PositionRfid', {
      mode: 'register',
      farm: routeFarm,
    });
  };

  // Gera código silenciosamente — sem popup, sem mostrar no campo
  const marcarSemCodigo = () => {
    setCodigo(gerarCodigoAleatorio());
    setCodigoVeioDaTag(false);
  };

  const handleRegister = async () => {
    if (!name || !genero || !tipo || !raca) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, gênero, tipo e raça.');
      return;
    }
    if (!peso || !idade) {
      Alert.alert('Campos obrigatórios', 'Preencha peso e idade.');
      return;
    }
    if (!codigo) {
      Alert.alert(
        'Código obrigatório',
        'Use "Ler tag" para ler o brinco do animal, ou "Sem código" para continuar sem brinco.'
      );
      return;
    }
    if (!farmId) {
      Alert.alert('Erro', 'Fazenda não identificada. Volte e selecione a fazenda novamente.');
      return;
    }

    setLoading(true);
    try {
      const localImageUri = imageAsset?.localUri ?? imageAsset?.uri ?? null;
      const form = new FormData();
      form.append('nome_animal', name);
      form.append('codigo', codigo);
      form.append('genero', genero);
      form.append('tipo', tipo);
      form.append('raca', raca);
      form.append('peso', String(peso));
      form.append('idade', String(idade));
      form.append('id_fazenda', farmId);

      if (localImageUri && Platform.OS !== 'web') {
        const filename = localImageUri.split('/').pop() || 'photo.jpg';
        const ext = filename.match(/\.(\w+)$/)?.[1] ?? 'jpg';
        (form as any).append('imagem', { uri: localImageUri, name: filename, type: `image/${ext}` });
      }

      await api.post('/animais', form);
      Alert.alert('Sucesso', 'Animal cadastrado com sucesso.', [
        { text: 'OK', onPress: () => navigation.navigate('Herd', { farm: routeFarm }) },
      ]);
    } catch (error: any) {
      console.error('[RegisterAnimal] Erro:', error?.response?.status, JSON.stringify(error?.response?.data));
      const message = error?.response?.data?.message ?? error?.response?.data?.error ?? error?.message ?? 'Erro desconhecido';
      Alert.alert('Erro', 'Não foi possível cadastrar o animal: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Image source={require("../../../assets/logoescura 1.png")} style={styles.logo} />
        <View style={styles.formContainer}>
          <Text style={styles.title}>Cadastro de Animal</Text>
          {farmName ? <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>Fazenda: {farmName}</Text> : null}

          <Text style={styles.inputLabel}>Nome do Animal: *</Text>
          <TextInput style={styles.input} value={name} placeholder="Ex.: Mimosa" placeholderTextColor="#D3D3D3" onChangeText={setName} editable={!loading} />

          {/* Código: só aparece se veio de leitura NFC */}
          {codigoVeioDaTag && (
            <>
              <Text style={styles.inputLabel}>Código do brinco:</Text>
              <TextInput
                style={styles.input}
                value={codigo}
                placeholderTextColor="#D3D3D3"
                onChangeText={setCodigo}
                editable={!loading}
              />
            </>
          )}

          {/* Botões de código */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={lerTagNfc}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: '#282113',
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Ler tag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={marcarSemCodigo}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: codigo && !codigoVeioDaTag ? '#4D5C52' : '#888',
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                {codigo && !codigoVeioDaTag ? '✓ Sem código' : 'Sem código'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Gênero: *</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity style={[styles.select, openGenero && styles.selectOpen]} onPress={() => { if (!loading) { setOpenGenero(!openGenero); setOpenTipo(false); } }} disabled={loading}>
              <Text style={styles.selectText}>{genero ? genero : "Selecione o gênero"}</Text>
              <Image source={require("../../../assets/arrow-down.png")} style={styles.arrowselect} />
            </TouchableOpacity>
            {openGenero && (
              <View style={styles.dropdown}>
                {["Fêmea", "Macho"].map((item) => (
                  <TouchableOpacity key={item} style={styles.option} onPress={() => { setGenero(item); setOpenGenero(false); }}>
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.inputLabel}>Tipo: *</Text>
          <View style={styles.selectWrapper}>
            <TouchableOpacity style={[styles.select, openTipo && styles.selectOpen]} onPress={() => { if (!loading) { setOpenTipo(!openTipo); setOpenGenero(false); } }} disabled={loading}>
              <Text style={styles.selectText}>{tipo ? tipo : "Selecione o tipo"}</Text>
              <Image source={require("../../../assets/arrow-down.png")} style={styles.arrowselect} />
            </TouchableOpacity>
            {openTipo && (
              <View style={styles.dropdown}>
                {["Leiteira", "Corte", "Mista"].map((item) => (
                  <TouchableOpacity key={item} style={styles.option} onPress={() => { setTipo(item); setOpenTipo(false); }}>
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.inputLabel}>Raça: *</Text>
          <TextInput style={styles.input} value={raca} placeholder="Ex.: Holandesa" placeholderTextColor="#D3D3D3" onChangeText={setRaca} editable={!loading} />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Peso (kg): *</Text>
              <TextInput style={styles.input} placeholder="Ex.: 600" value={peso} placeholderTextColor="#D3D3D3" onChangeText={setPeso} editable={!loading} keyboardType="numeric" />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Idade (anos): *</Text>
              <TextInput style={styles.input} placeholder="Ex.: 2" placeholderTextColor="#D3D3D3" value={idade} onChangeText={setIdade} editable={!loading} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.photoBox}>
            <TouchableOpacity style={styles.photoLeft} onPress={abrirGaleria} disabled={loading}>
              {foto ? <Image source={{ uri: foto }} style={styles.photoPreview} /> : <Image source={require("../../../assets/camera.png")} style={styles.cameraIcon} />}
            </TouchableOpacity>
            <Text style={styles.photoText}>Adicione uma foto do animal clicando na câmera.</Text>
          </View>

          <TouchableOpacity style={[styles.button, { opacity: loading ? 0.6 : 1 }]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Cadastrar Animal</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
