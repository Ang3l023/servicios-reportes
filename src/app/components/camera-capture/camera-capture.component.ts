import { Component, EventEmitter, OnDestroy, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ImageService } from '../../services/image.service';
import {Capacitor} from '@capacitor/core';
import {CameraNativeService} from '../../services/camera-native.service';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './camera-capture.component.html',
  styleUrl: './camera-capture.component.scss'
})
export class CameraCaptureComponent implements OnDestroy {
  @Output() photoTaken = new EventEmitter<File>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  isCameraOpen = false;
  errorMessage = '';

  constructor(private imageService: ImageService,
              private cameraNative: CameraNativeService,) {}

  close() {
    this.isCameraOpen = false;
    this.closed.emit();
  }

  async onTakePhoto() {
    try {
      await this.cameraNative.takePhoto('Foto tomada');
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'No se pudo abrir la cámara. Revisa los permisos.');
    }
  }

  async onPickGallery() {
    try {
      if (Capacitor.isNativePlatform()) {
        await this.cameraNative.pickFromGallery('Desde galería');
      } else {
        // input file web
        document.getElementById('fileInput')?.click();
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'No se pudo abrir la galería');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    Array.from(input.files).forEach((file, i) => {
      this.imageService.addImage(file, `Imagen ${i + 1}`);
    });
    input.value = '';
  }

  ngOnDestroy() {
    // this.imageService.stopCamera();
  }
}
