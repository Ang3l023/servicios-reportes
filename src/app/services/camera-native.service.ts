import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ImageService } from './image.service';

@Injectable({ providedIn: 'root' })
export class CameraNativeService {
  constructor(private imageService: ImageService) {}

  /** Foto con cámara nativa (APK) o fallback web */
  async takePhoto(label = 'Foto tomada') {
    if (Capacitor.isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true
      });

      if (photo.dataUrl) {
        await this.imageService.addFromDataUrl(
          photo.dataUrl,
          label,
          `foto_${Date.now()}.jpg`
        );
      }
      return;
    }

    // Fallback navegador (PWA / desktop)
    await this.takePhotoWeb(label);
  }

  /** Elegir de galería nativa */
  async pickFromGallery(label = 'Desde galería') {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Galería nativa solo en APK');
    }

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    if (photo.dataUrl) {
      await this.imageService.addFromDataUrl(
        photo.dataUrl,
        label,
        `galeria_${Date.now()}.jpg`
      );
    }
  }

  private async takePhotoWeb(label: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    // Si ya tienes CameraCaptureComponent, puedes seguir usándolo.
    // Aquí solo dejamos el hook nativo prioritario.
    stream.getTracks().forEach(t => t.stop());
    console.warn('En web usa tu componente de cámara HTML5');
  }
}
