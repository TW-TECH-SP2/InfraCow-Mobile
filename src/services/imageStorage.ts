import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const IMAGE_DIR = `${FileSystem.documentDirectory}infracow-images/`;

export type LocalImage = {
  localUri: string;
  filename: string;
  mimeType: string;
};

export async function saveImageLocally(sourceUri: string, mimeType = 'image/jpeg'): Promise<LocalImage> {
  const origName = sourceUri.split('/').pop() || `image_${Date.now()}.jpg`;
  const storedFilename = `${Date.now()}_${origName}`;

  if (Platform.OS === 'web') {
    // In web, preserve the original URI; browser storage is handled separately by the upload flow.
    return { localUri: sourceUri, filename: storedFilename, mimeType };
  }

  try {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    const destination = `${IMAGE_DIR}${storedFilename}`;
    await FileSystem.copyAsync({ from: sourceUri, to: destination });

    // verify file exists and return stable filename (the storedFilename)
    const info = await FileSystem.getInfoAsync(destination);
    if (!info.exists) {
      throw new Error('Failed to save image to persistent storage');
    }

    return { localUri: destination, filename: storedFilename, mimeType };
  } catch (error) {
    console.warn('saveImageLocally failed, returning source uri as fallback', error);
    return { localUri: sourceUri, filename: origName, mimeType };
  }
}

export async function deleteImageLocally(localUri?: string | null) {
  if (!localUri) return;
  if (Platform.OS === 'web') return;

  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (error) {
    console.warn('deleteImageLocally failed', error);
  }
}
