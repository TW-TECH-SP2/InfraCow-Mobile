import { View, Image, TextInput, TouchableOpacity, Alert } from "react-native";
import Text from "../../components/Text";
import { useState, useEffect } from "react";
import styles from "./styles";
import auth from "../../services/auth";
import NetInfo from "@react-native-community/netinfo";

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Preencha os campos', 'Nome, email e senha são obrigatórios');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Senha', 'As senhas não conferem');
      return;
    }

    if (!isOnline) {
      Alert.alert('Sem conexão', 'Você precisa estar conectado à internet para se cadastrar');
      return;
    }

    try {
      setLoading(true);
      console.log('[Register] Iniciando cadastro...');
      await auth.signUp({ name, email, password });
      Alert.alert('Sucesso', 'Conta criada com sucesso');
      navigation.navigate('Login');
    } catch (err: any) {
      console.log('=== ERRO CADASTRO ===');
      console.log('Status:', err?.response?.status);
      console.log('Data:', JSON.stringify(err?.response?.data, null, 2));
      console.log('Message:', err?.message);
      console.log('Full Error:', JSON.stringify(err, null, 2));
      console.log('=== FIM ERRO ===');
      
      let message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Erro ao cadastrar';
      
      if (message.includes('email')) {
        message = 'Este email já está cadastrado';
      } else if (message.includes('Sequelize') || message.includes('validation')) {
        message = 'Verifique os dados preenchidos e tente novamente';
      }
      
      Alert.alert('Falha', message);
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

      <View style={styles.topContent}>
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
        <Text style={styles.title}>Crie a sua conta</Text>

        {!isOnline && (
          <View style={{ backgroundColor: '#fee', padding: 10, borderRadius: 5, marginBottom: 15 }}>
            <Text style={{ color: '#c00', fontSize: 12 }}>⚠️ Sem conexão com a internet</Text>
          </View>
        )}

        <Text style={styles.legendacampo}>Nome completo</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName}
          editable={!loading}
          placeholder="João Silva"
        />

        <Text style={styles.legendacampo}>Email</Text>
        <TextInput 
          style={styles.input} 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address" 
          autoCapitalize="none"
          editable={!loading}
          placeholder="seu@email.com"
        />

        <Text style={styles.legendacampo}>Senha</Text>
        <TextInput 
          style={styles.input} 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword}
          editable={!loading}
          placeholder="••••••••"
        />

        <Text style={styles.legendacampo}>Confirme sua senha</Text>
        <TextInput 
          style={styles.input} 
          secureTextEntry 
          value={confirm} 
          onChangeText={setConfirm}
          editable={!loading}
          placeholder="••••••••"
        />

        <TouchableOpacity 
          style={[styles.button, { opacity: loading || !isOnline ? 0.6 : 1 }]} 
          onPress={handleRegister} 
          disabled={loading || !isOnline}
        >
          <Text style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}