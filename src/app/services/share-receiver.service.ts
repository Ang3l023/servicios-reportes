import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ShareReceiver } from '../plugins/share-receiver.plugin';
import { ImageService } from './image.service';

@Injectable({ providedIn: 'root' })
export class ShareReceiverService {
  private loading = false;

  constructor(
    private imageService: ImageService,
    private zone: NgZone
  ) {}

  init() {
    if (!Capacitor.isNativePlatform()) return;

    // Al abrir la app
    this.pullPendingImages();

    // Cuando la app vuelve al frente (share con app en segundo plano)
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) this.pullPendingImages();
    });

    // Señal desde MainActivity
    window.addEventListener('checkSharedImages', () => {
      this.zone.run(() => this.pullPendingImages());
    });

    // Reintentos por si Honor/Motorola tardan
    setTimeout(() => this.pullPendingImages(), 800);
    setTimeout(() => this.pullPendingImages(), 2000);
    setTimeout(() => this.pullPendingImages(), 4000);
  }

  async pullPendingImages() {
    if (this.loading) return;
    this.loading = true;

    try {
      const result = await ShareReceiver.getPendingImages();
      const raw = result?.imagesJson || '[]';
      const list: string[] = JSON.parse(raw);

      if (!list.length) {
        this.loading = false;
        return;
      }

      console.log('[Share] Importando', list.length, 'imágenes');

      for (let i = 0; i < list.length; i++) {
        const b64 = list[i];
        if (!b64) continue;

        const dataUrl = b64.startsWith('data:')
          ? b64
          : `data:image/jpeg;base64,${b64}`;

        await this.imageService.addFromDataUrl(
          dataUrl,
          `Compartida ${i + 1}`,
          `compartida_${Date.now()}_${i}.jpg`
        );
      }

      await ShareReceiver.clearPendingImages();
    } catch (e) {
      console.error('[Share] Error', e);
    } finally {
      this.loading = false;
    }
  }
}
