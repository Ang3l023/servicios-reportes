import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { ImageService } from '../../services/image.service';
import { ReportImage } from '../../models/service-report.model';

@Component({
  selector: 'app-manage-images',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    DragDropModule,
    FormsModule,
  ],
  templateUrl: './manage-images.component.html',
  styleUrl: './manage-images.component.scss'
})
export class ManageImagesComponent implements OnInit {
  images: ReportImage[] = [];
  hasOrderChanged = false;
  isReordering = false;

  constructor(
    public dialogRef: MatDialogRef<ManageImagesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private imageService: ImageService
  ) {}

  ngOnInit() {
    // Copia profunda para no mutar el original hasta guardar
    this.images = this.imageService.getSnapshot().map(img => ({ ...img }));
    this.validateAndFixOrder();
  }

  /** Reordena al soltar un elemento */
  drop(event: CdkDragDrop<ReportImage[]>) {
    if (event.previousIndex === event.currentIndex) return;

    moveItemInArray(this.images, event.previousIndex, event.currentIndex);
    this.recalculateOrder();
    this.hasOrderChanged = true;
  }

  /** Recalcula el campo order de forma secuencial (1, 2, 3...) */
  private recalculateOrder() {
    this.images = this.images.map((img, index) => ({
      ...img,
      order: index + 1
    }));
  }

  /** Válida que no haya órdenes duplicados o huecos */
  private validateAndFixOrder() {
    const orders = this.images.map(img => img.order);
    const hasDuplicates = new Set(orders).size !== orders.length;
    const hasGaps = orders.some((order, index) => order !== index + 1);

    if (hasDuplicates || hasGaps || orders.some(o => o < 1)) {
      console.warn('Se detectó un orden inválido. Se corrigió automáticamente.');
      this.recalculateOrder();
      this.hasOrderChanged = true;
    }
  }

  /** Elimina una imagen y reordena */
  remove(id: string) {
    this.images = this.images.filter(img => img.id !== id);
    this.recalculateOrder();
    this.hasOrderChanged = true;
  }

  /** Agrega nuevas imágenes desde el input file */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    Array.from(input.files).forEach(file => {
      // Validación básica de tipo y tamaño
      if (!file.type.startsWith('image/')) {
        alert(`El archivo ${file.name} no es una imagen válida`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10 MB
        alert(`El archivo ${file.name} supera los 10 MB`);
        return;
      }

      this.imageService.addImage(file, 'Nueva imagen');
    });

    // Refrescamos la lista local
    this.images = this.imageService.getSnapshot().map(img => ({ ...img }));
    this.recalculateOrder();
    this.hasOrderChanged = true;

    // Limpiar el input para permitir seleccionar el mismo archivo otra vez
    input.value = '';
  }

  /** Guarda los cambios de orden en el servicio */
  save() {
    this.validateAndFixOrder();

    // Enviamos el nuevo orden al servicio
    this.imageService.updateOrder(this.images);

    this.dialogRef.close({
      saved: true,
      images: this.images
    });
  }

  /** Cancela sin guardar */
  cancel() {
    this.dialogRef.close({ saved: false });
  }

  moveUp(index: number) {
    if (index <= 0 || this.isReordering) return;

    this.isReordering = true;
    moveItemInArray(this.images, index, index - 1);
    this.recalculateOrder();
    this.hasOrderChanged = true;

    // Pequeño delay para que se vea la animación CSS
    setTimeout(() => {
      this.isReordering = false;
    }, 300);
  }

  moveDown(index: number) {
    if (index >= this.images.length - 1 || this.isReordering) return;

    this.isReordering = true;
    moveItemInArray(this.images, index, index + 1);
    this.recalculateOrder();
    this.hasOrderChanged = true;

    setTimeout(() => {
      this.isReordering = false;
    }, 300);
  }
}
