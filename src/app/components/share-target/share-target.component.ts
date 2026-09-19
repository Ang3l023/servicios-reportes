import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
          <mat-icon class="text-5xl text-slate-600">
            share
          </mat-icon>
        </div>

        <p class="text-lg font-medium text-slate-800 mb-2">
          Recibiendo imágenes
        </p>

        <p class="text-sm text-slate-500">
          {{ status }}
        </p>
      </div>
    </div>
  `
})
export class ShareTargetComponent implements OnInit {

  status = 'Procesando imágenes...';

  constructor(
    private imageService: ImageService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const shareId = this.route.snapshot.queryParamMap.get('shareId');

      if (!shareId) {
        this.status = 'No se recibieron imágenes o ID inválido';
        this.redirectHome(1500);
        return;
      }

      // Consultamos el endpoint Serverless de Vercel
      this.http.get<{ files: Array<{ name: string; type: string; data: string }> }>(`/api/get-share?id=${shareId}`)
        .subscribe({
          next: (response) => {
            if (!response.files || !response.files.length) {
              this.status = 'No se encontraron imágenes';
              this.redirectHome(1500);
              return;
            }

            let added = 0;

            for (const fileData of response.files) {
              // Convertimos Base64 a objeto File para pasarlo a tu ImageService
              const file = this.base64ToFile(fileData.data, fileData.name, fileData.type);

              if (file.type.startsWith('image/')) {
                this.imageService.addImage(file, `Compartida ${added + 1}`);
                added++;
              }
            }

            this.status = `${added} imagen(es) agregadas`;
            this.redirectHome(1000);
          },
          error: (err) => {
            console.error('Error al obtener imágenes desde Vercel KV:', err);
            this.status = 'Error al recibir las imágenes';
            this.redirectHome(2000);
          }
        });

    } catch (error) {
      console.error('Error al recuperar imágenes:', error);
      this.status = 'Error al recibir las imágenes';
      this.redirectHome(2000);
    }
  }

  private base64ToFile(base64Data: string, filename: string, mimeType: string): File {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  private redirectHome(ms: number): void {
    setTimeout(() => {
      this.router.navigateByUrl('/');
    }, ms);
  }
}
