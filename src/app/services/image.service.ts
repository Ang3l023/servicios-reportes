import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ReportImage } from '../models/service-report.model';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private imagesSubject = new BehaviorSubject<ReportImage[]>([]);
  images$ = this.imagesSubject.asObservable();

  getSnapshot(): ReportImage[] {
    return this.imagesSubject.value;
  }

  addImage(file: File, label = 'Sin etiqueta') {
    const previewUrl = URL.createObjectURL(file);
    const current = this.imagesSubject.value;

    const newImage: ReportImage = {
      id: crypto.randomUUID(),
      file,
      previewUrl,
      label,
      order: current.length + 1,
      sizeKB: Math.round(file.size / 1024)
    };

    this.imagesSubject.next([...current, newImage]);
  }

  async addFromBlob(blob: Blob, label = 'Imagen', fileName = 'image.jpg') {
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    this.addImage(file, label);
  }

  updateOrder(images: ReportImage[]) {
    const ordered = images.map((img, index) => ({ ...img, order: index + 1 }));
    this.imagesSubject.next(ordered);
  }

  removeImage(id: string) {
    const next = this.imagesSubject.value
      .filter(img => img.id !== id)
      .map((img, index) => ({ ...img, order: index + 1 }));
    this.imagesSubject.next(next);
  }

  clear() {
    this.imagesSubject.value.forEach(img => {
      if (img.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    this.imagesSubject.next([]);
  }

  async addFromDataUrl(dataUrl: string, label = 'Foto', fileName = 'photo.jpg') {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    this.addImage(file, label);
  }
}
