import api from './api';
import { deleteImageLocally } from './imageStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { clearSession, getSession, setSession } from '../database/services';

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
  const currentSession = (await getSession<Record<string, any>>()) ?? {};
  await setSession({ ...currentSession, user });
};

const persistSessionPatch = async (patch: Record<string, any>) => {
  const currentSession = (await getSession<Record<string, any>>()) ?? {};
  await setSession({ ...currentSession, ...patch });
};

const extractUser = (data: any) => {
  console.log('[Auth] extractUser input:', JSON.stringify(data, null, 2));
  
  if (data?.usuario) {
    const result = {
      id_usuario: data.usuario.id ?? data.usuario.id_usuario,
      nome: data.usuario.nome,
      email: data.usuario.email,
      imagem: data.usuario.imagem ?? data.usuario.foto,
    };
    console.log('[Auth] extracted from data.usuario:', result);
    return result;
  }
  if (data?.user) {
    const result = {
      id_usuario: data.user.id ?? data.user.id_usuario,
      nome: data.user.nome,
      email: data.user.email,
      imagem: data.user.imagem ?? data.user.foto,
    };
    console.log('[Auth] extracted from data.user:', result);
    return result;
  }
  if (data?.nome || data?.email) {
    const result = {
      id_usuario: data.id ?? data.id_usuario,
      nome: data.nome,
      email: data.email,
      imagem: data.imagem ?? data.foto,
    };
    console.log('[Auth] extracted from data directly:', result);
    return result;
  }
  console.log('[Auth] extractUser could not extract user from data');
  return null;
};

const signIn = async (credentials: Credentials, remember = true) => {
  try {
    const res = await api.post('/login', {
      email: credentials.email,
      senha: credentials.password,
    });

    console.log('[Auth] Login response from backend:', JSON.stringify(res.data, null, 2));

    const token = res.data?.token;
    const usuario = extractUser(res.data);

    console.log('[Auth] Extracted user:', usuario);

    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (usuario) await saveUser(usuario);
      await persistSessionPatch({ token, user: usuario });
    }

    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return { token, user: usuario, offline: false };
  } catch (err) {
    throw err;
  }
};

const updateProfile = async ({ name, email, password, imageAsset }: UpdateProfilePayload) => {
  const hasNewImage = Boolean(imageAsset?.uri);

  const buildJsonPayload = () => {
    const payload: Record<string, any> = {
      nome: name,
      email,
    };

    if (password) {
      payload.senha = password;
    }

    return payload;
  };

  const buildFormData = async (imageField: 'foto' | 'imagem') => {
    const formData = new FormData();
    formData.append('nome', name);
    formData.append('email', email);

    if (password) {
      formData.append('senha', password);
    }

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
      // Some backends still expect `foto` instead of `imagem`.
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
    imagem:
      responseUser?.imagem ??
      responseUser?.foto ??
      currentUser?.imagem ??
      currentUser?.foto,
    localImageUri: imageAsset?.localUri ?? currentUser?.localImageUri ?? null,
  };
  // If user replaced their image, remove previous local file to avoid orphan files
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
  console.log('[Auth] Starting signUp with data:', { name: data.name, email: data.email });
  
  try {
    const payload = {
      nome: data.name,
      email: data.email,
      senha: data.password,
    };
    console.log('[Auth] SignUp payload:', payload);
    
    const res = await api.post('/usuario', payload);
    console.log('[Auth] SignUp response status:', res.status);
    console.log('[Auth] SignUp response data:', JSON.stringify(res.data, null, 2));
    
    return res.data;
  } catch (error: any) {
    console.log('[Auth] SignUp error status:', error?.response?.status);
    console.log('[Auth] SignUp error data:', JSON.stringify(error?.response?.data, null, 2));
    console.log('[Auth] SignUp error message:', error?.message);
    console.log('[Auth] SignUp error config URL:', error?.config?.url);
    throw error;
  }
};

const signOut = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await clearSession();
  delete api.defaults.headers.common['Authorization'];
};

const getToken = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) return token;

  const session = await getSession<Record<string, any>>();
  return session?.token ?? null;
};

const getUser = async () => {
  const session = await getSession<Record<string, any>>();
  if (session?.user) {
    return session.user;
  }

  return null;
};

const getLoggedUser = async () => {
  // Simply return user from local storage (which now has id_usuario from login)
  console.log('[Auth] getLoggedUser: returning user from storage');
  return getUser();
};

export default {
  signIn,
  signUp,
  signOut,
  getToken,
  getUser,
  getLoggedUser,
  updateProfile,
};