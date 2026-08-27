import { View, Image, TextInput, TouchableOpacity, Alert } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import styles from "./styles";
import auth from "../../services/auth";

export default function LoginScreen({ navigation }: any) {
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await auth.signIn({ email, password }, remember);
      if (res?.token) {
        navigation.replace("Home");
      } else {
        Alert.alert("Erro", "Resposta inválida do servidor");
      }
    } catch (err: any) {
      console.log('=== ERRO LOGIN ===');
      console.log('Status:', err?.response?.status);
      console.log('Data:', JSON.stringify(err?.response?.data, null, 2));
      console.log('Message:', err?.message);
      console.log('=== FIM ERRO ===');
      const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Erro ao conectar';
      Alert.alert("Falha ao entrar", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/back-fomuser.png")}
        style={styles.backgroundformuser}
      />

      <View style={styles.rowlogo}>
        <TouchableOpacity onPress={() => navigation.navigate("Auth")}>
          <Image
            source={require("../../../assets/back-light.png")}
            style={styles.voltar}
          />
        </TouchableOpacity>
        <Image
          source={require("../../../assets/logo-pequena-formuser.png")}
          style={styles.logopequena}
        />
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Entre com a {"\n"}sua conta</Text>

        <Text style={styles.legendacampo}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu email"
          placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.legendacampo}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite sua senha"
          placeholderTextColor="#ccc"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setRemember(!remember)}
        >
          <View style={[styles.checkbox, remember && styles.checkboxChecked]} />
          <Text style={styles.checkboxText}>Lembrar de mim</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}