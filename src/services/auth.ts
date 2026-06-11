import api from './api';
import { deleteImageLocally } from './imageStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SESSION_STORAGE_KEY = '@infracow_kv:session:active';
const TOKEN_KEY = '@infracow_token';

type Credentials = { email: string; password: string };

type UpdateProfilePayload = {
  name: string;
  email: string;
  password?: string;
  imageAsset?: any;
};

const saveUser = async (user: any) => {
  if (!user || typeof user !== 'object') return;
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const currentSession = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...currentSession, user }));
  } catch (e) {
    console.warn('saveUser error', e);
  }
};

const persistSessionPatch = async (patch: Record<string, any>) => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const currentSession = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...currentSession, ...patch }));
  } catch (e) {
    console.warn('persistSessionPatch error', e);
  }
};

const extractUser = (data: any) => {
  if (data?.usuario) {
    return {
      id_usuario: data.usuario.id ?? data.usuario.id_usuario,
      nome: data.usuario.nome,
      email: data.usuario.email,
      imagem: data.usuario.imagem ?? data.usuario.foto,
    };
  }
  if (data?.user) {
    return {
      id_usuario: data.user.id ?? data.user.id_usuario,
      nome: data.user.nome,
      email: data.user.email,
      imagem: data.user.imagem ?? data.user.foto,
    };
  }
  if (data?.nome || data?.email) {
    return {
      id_usuario: data.id ?? data.id_usuario,
      nome: data.nome,
      email: data.email,
      imagem: data.imagem ?? data.foto,
    };
  }
  return null;
};

const signIn = async (credentials: Credentials, remember = true) => {
  try {
    const res = await api.post('/login', {
      email: credentials.email,
      senha: credentials.password,
    });

    const token = res.data?.token;
    const usuario = extractUser(res.data);

    if (!token) {
      throw new Error('Token não retornado pelo servidor');
    }

    await AsyncStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, user: usuario }));
    } catch (e) {
      console.warn('Error saving session', e);
    }

    return { token, user: usuario, offline: false };
  } catch (err) {
    throw err;
  }
};

const updateProfile = async ({ name, email, password, imageAsset }: UpdateProfilePayload) => {
  const hasNewImage = Boolean(imageAsset?.uri);

  const buildJsonPayload = () => {
    const payload: Record<string, any> = { nome: name, email };
    if (password) payload.senha = password;
    return payload;
  };

  const buildFormData = async (imageField: 'foto' | 'imagem') => {
    const formData = new FormData();
    formData.append('nome', name);
    formData.append('email', email);
    if (password) formData.append('senha', password);

    if (imageAsset?.uri) {
      if (Platform.OS === 'web') {
        const resp = await fetch(imageAsset.uri);
        const blob = await resp.blob();
        const filename = imageAsset.fileName ?? imageAsset.filename ?? `perfil_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: imageAsset.mimeType ?? blob.type ?? 'image/jpeg' });
        formData.append(imageField, file);
      } else {
        formData.append(imageField, {
          uri: imageAsset.uri,
          name: imageAsset.fileName ?? `perfil_${Date.now()}.jpg`,
          type: imageAsset.mimeType ?? 'image/jpeg',
        } as any);
      }
    }

    return formData;
  };

  let res;
  if (!hasNewImage) {
    res = await api.put('/perfil', buildJsonPayload());
  } else {
    try {
      const formImagem = await buildFormData('imagem');
      res = await api.put('/perfil', formImagem);
    } catch (firstError: any) {
      const formFoto = await buildFormData('foto');
      res = await api.put('/perfil', formFoto);
    }
  }

  const currentUser = await getUser();
  const responseUser = extractUser(res.data);
  const mergedUser = {
    ...(currentUser ?? {}),
    ...(responseUser ?? {}),
    nome: responseUser?.nome ?? name,
    email: responseUser?.email ?? email,
    imagem: responseUser?.imagem ?? responseUser?.foto ?? currentUser?.imagem ?? currentUser?.foto,
    localImageUri: imageAsset?.localUri ?? currentUser?.localImageUri ?? null,
  };

  try {
    if (imageAsset?.localUri && currentUser?.localImageUri && currentUser.localImageUri !== imageAsset.localUri) {
      await deleteImageLocally(currentUser.localImageUri);
    }
  } catch (e) {
    console.warn('Failed to delete previous local image', e);
  }

  await saveUser(mergedUser);
  await persistSessionPatch({ user: mergedUser });
  return res.data;
};

const signUp = async (data: any) => {
  const payload = { nome: data.name, email: data.email, senha: data.password };
  const res = await api.post('/usuario', payload);
  return res.data;
};

const signOut = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Error clearing session', e);
  }
  delete api.defaults.headers.common['Authorization'];
};

const getToken = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) return token;
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session?.token ?? null;
  } catch (e) {
    return null;
  }
};

const getUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (session?.user) return session.user;
    return null;
  } catch (e) {
    return null;
  }
};

const restoreToken = async () => {
  const token = await getToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return token;
};

const getLoggedUser = async () => {
  return getUser();
};

export default { signIn, signUp, signOut, getToken, getUser, getLoggedUser, updateProfile, restoreToken, saveUserData: saveUser };
