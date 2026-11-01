let FS: any = null;
try {
  FS = require("expo-file-system/legacy");
} catch {
  FS = null;
}

const TIMEOUT_MS = 20000;

function mimePorExtensao(uri: string): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promessa.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function viaFileSystem(uri: string): Promise<string> {
  if (!FS) throw new Error("expo-file-system/legacy indisponível");

  let caminho = uri;

  if (/^https?:\/\//i.test(uri)) {
    const destino = `${FS.cacheDirectory}pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const res = await FS.downloadAsync(uri, destino);
    if (res?.status && res.status >= 400) throw new Error(`HTTP ${res.status}`);
    caminho = res.uri;
  }

  const base64: string = await FS.readAsStringAsync(caminho, {
    encoding: FS.EncodingType?.Base64 ?? "base64",
  });
  if (!base64) throw new Error("arquivo vazio");

  return `data:${mimePorExtensao(uri)};base64,${base64}`;
}

async function viaFetch(uri: string): Promise<string> {
  const resp = await fetch(uri);
  if (!resp.ok && resp.status !== 0) throw new Error(`HTTP ${resp.status}`);

  const blob = await resp.blob();
  const dataUri: string = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader falhou"));
    reader.readAsDataURL(blob);
  });

  if (!dataUri.startsWith("data:") || dataUri.length < 40) throw new Error("conteúdo inválido");
  if (/^data:image\//i.test(dataUri)) return dataUri;


  return dataUri.replace(/^data:[^;,]*/, `data:${mimePorExtensao(uri)}`);
}

export async function imagemParaDataUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith("data:")) return uri;

  try {
    return await comTimeout(viaFileSystem(uri), TIMEOUT_MS);
  } catch (e) {
    console.warn("[PDF] leitura via FileSystem falhou, tentando fetch:", uri, e);
  }

  try {
    return await comTimeout(viaFetch(uri), TIMEOUT_MS);
  } catch (e) {
    console.warn("[PDF] não foi possível carregar a imagem:", uri, e);
    return null; 
  }
}