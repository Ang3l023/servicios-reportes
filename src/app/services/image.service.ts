import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ReportImage } from '../models/service-report.model';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private imagesSubject = new BehaviorSubject<ReportImage[]>([]);
  images$ = this.imagesSubject.asObservable();

  private stream: MediaStream | null = null;

  async openCamera(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // rear camera on mobile
        audio: false
      });
      return this.stream;
    } catch (err) {
      console.error('Could not access the camera', err);
      throw err;
    }
  }

  stopCamera() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }

  capturePhoto(videoElement: HTMLVideoElement): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoElement, 0, 0);
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85);
    });
  }

  addImage(file: File, label = 'Sin etiqueta') {
    const previewUrl = URL.createObjectURL(file);

    const current = this.imagesSubject.value;
    const newImage: ReportImage = {
      id: crypto.randomUUID(),
      file,
      previewUrl,
      label,
      order: current.length + 1,   // siempre al final
      sizeKB: Math.round(file.size / 1024)
    };

    this.imagesSubject.next([...current, newImage]);
  }

  updateOrder(images: ReportImage[]) {
    // Validamos y forzamos orden secuencial
    const ordered = images.map((img, index) => ({
      ...img,
      order: index + 1
    }));

    this.imagesSubject.next(ordered);
  }

  removeImage(id: string) {
    const filtered = this.imagesSubject.value.filter(img => img.id !== id);
    this.imagesSubject.next(filtered);
  }

  getSnapshot(): ReportImage[] {
    return this.imagesSubject.value;
  }
}
