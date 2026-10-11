import { useState } from 'react';

export function usePhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (localUri: string, uploadUrl: string): Promise<boolean> => {
    try {
      setIsUploading(true);
      setError(null);

      // Mock API hands out mock:// URLs; there is no storage to upload to.
      if (uploadUrl.startsWith('mock://')) {
        return true;
      }

      const response = await fetch(localUri);
      const blob = await response.blob();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok) {
        const body = await uploadResponse.text().catch(() => '');
        throw new Error(`Upload failed with status ${uploadResponse.status}: ${body}`);
      }
      
      return true;
    } catch (e) {
      console.error('Upload error', e);
      setError('Błąd wysyłania zdjęcia');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    upload,
    isUploading,
    error,
  };
}
