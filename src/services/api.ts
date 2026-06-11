import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const TOKEN_KEY = '@infracow_token';

const getApiUrl = (): string => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? 'https://infracow-api-hv24.onrender.com';
};

const api = axios.create({
  baseURL: getApiUrl(),
  // sem timeout — servidor pode demorar para acordar, espera o tempo que precisar
});

// Injeta o token automaticamente em TODA requisição
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // sem token, segue sem
  }
  return config;
});

// Trata erro de rede globalmente (sem internet)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkError = !error.response && error.message === 'Network Error';
    if (isNetworkError) {
      Alert.alert(
        'Sem conexão',
        'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      );
    }
    return Promise.reject(error);
  }
);

export default api;
export type { AxiosInstance } from 'axios';
