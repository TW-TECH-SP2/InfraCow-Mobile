import { View, Image, TouchableOpacity } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import React from "react";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import auth from "../../services/auth";
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

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [userPhotoError, setUserPhotoError] = useState(false);
  const userPhotoRaw = user?.localImageUri ?? user?.imagem ?? user?.foto ?? user?.imageUrl;
  const userPhoto = resolveUserPhoto(userPhotoRaw);

  useFocusEffect(
    React.useCallback(() => {
      const loadUser = async () => {
        try {
          console.log('=== PROFILE LOAD USER ===');
          const userData = await auth.getUser();
          console.log('User data retrieved:', JSON.stringify(userData, null, 2));
          setUser(userData);
          setUserPhotoError(false);
        } catch (err) {
          console.log('Error loading user:', err);
        }
      };
      loadUser();
    }, [])
  );

  return (
    <View style={styles.container}>
    <View style={styles.header}>
        <Image
          source={userPhoto && !userPhotoError ? { uri: userPhoto } : require("../../../assets/user-default.png")}
          style={styles.profileImage}
          onError={() => setUserPhotoError(true)}
        />

        <View style={styles.darkOverlay} />

        <View style={styles.overlay}>
            <Text style={styles.title}>Meu Perfil</Text>
            <Text style={styles.name}>{user?.nome || "Carregando..."}</Text>
            <Text style={styles.emailLabel}>Email:</Text>
            <Text style={styles.email}>{user?.email || "Carregando..."}</Text>
        </View>
        </View>

  <TouchableOpacity
  style={styles.editButton}
  onPress={() => navigation.navigate("EditUser")}
>
  <Image
    source={require("../../../assets/edit.png")}
    style={styles.editIcon}
  />
</TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Ajuda</Text>

        <TouchableOpacity style={styles.helpItem}
         onPress={() => navigation.navigate("Faq")}>
          <Image
            source={require("../../../assets/question.png")}
            style={styles.helpIcon}
          />

          <Text style={styles.helpText}>Perguntas frequentes</Text>

          <Image
            source={require("../../../assets/arrow-right.png")}
            style={styles.arrow}
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.helpItem, { marginTop: 20, backgroundColor: '#780406' }]}
          onPress={async () => {
            await auth.signOut();
            navigation.replace('Splash');
          }}
        >
          <Text style={[styles.helpText, { color: '#fff', fontWeight: 'bold' }]}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      <Navbar active="profile" />

    </View>
  );
}