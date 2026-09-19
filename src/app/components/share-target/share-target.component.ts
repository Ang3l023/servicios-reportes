import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-share-target',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div class="text-center max-w-sm">
        <div class="mb-4">
          <mat-icon class="text-5xl text-slate-600">share</mat-icon>
        </div>
        <p class="text-lg font-medium text-slate-800 mb-2">Recibiendo imágenes</p>
        <p class="text-sm text-slate-500">{{ status }}</p>
      </div>
    </div>
  `
})
export class ShareTargetComponent implements OnInit {
  status = 'Procesando imágenes...';

  constructor(
    private imageService: ImageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    try {
      const rawData = sessionStorage.getItem('pwa_shared_files');

      if (!rawData) {
        this.status = 'No se recibieron imágenes';
        setTimeout(() => this.router.navigateByUrl('/'), 1500);
        return;
      }

      const filesData: Array<{ name: string; type: string; data: string }> = JSON.parse(rawData);
      sessionStorage.removeItem('pwa_shared_files'); // Limpiar storage

      let added = 0;

      for (const item of filesData) {
        const file = this.dataURLtoFile(item.data, item.name);
        if (file.type.startsWith('image/')) {
          this.imageService.addImage(file, `Compartida ${added + 1}`);
          added++;
        }
      }

      this.status = `${added} imagen(es) agregadas`;
      setTimeout(() => this.router.navigateByUrl('/'), 1000);

    } catch (error) {
      console.error('Error al procesar imágenes compartidas:', error);
      this.status = 'Error al recibir las imágenes';
      setTimeout(() => this.router.navigateByUrl('/'), 1500);
    }
  }

  private dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
