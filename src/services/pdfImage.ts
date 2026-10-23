import * as FileSystem from "expo-file-system";

export async function imagemParaDataUri(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith("data:")) return uri;

  try {
    let caminho = uri;

    // Foto que veio do servidor: baixa pro cache antes de ler
    if (/^https?:\/\//i.test(uri)) {
      const destino = `${FileSystem.cacheDirectory}pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const res = await FileSystem.downloadAsync(uri, destino);
      caminho = res.uri;
    }

    const base64 = await FileSystem.readAsStringAsync(caminho, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = caminho.split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.warn("[PDF] falha ao ler imagem:", uri, e);
    return null; // o PDF sai sem foto em vez de quebrar
  }
}