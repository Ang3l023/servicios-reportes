import { Component, EventEmitter, OnDestroy, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ImageService } from '../../services/image.service';

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

  constructor(private imageService: ImageService) {}

  async openCamera() {
    try {
      const stream = await this.imageService.openCamera();
      this.isCameraOpen = true;
      this.errorMessage = '';

      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
        }
      });
    } catch (err) {
      this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
      console.error(err);
    }
  }

  async capture() {
    if (!this.videoRef?.nativeElement) return;

    try {
      const blob = await this.imageService.capturePhoto(this.videoRef.nativeElement);
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.photoTaken.emit(file);
      this.close();
    } catch (err) {
      console.error('Error capturing photo', err);
    }
  }

  close() {
    this.imageService.stopCamera();
    this.isCameraOpen = false;
    this.closed.emit();
  }

  ngOnDestroy() {
    this.imageService.stopCamera();
  }
}
