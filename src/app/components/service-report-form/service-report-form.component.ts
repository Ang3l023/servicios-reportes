import {Component, HostListener, OnInit} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ImageService } from '../../services/image.service';
import { ExportService } from '../../services/export.service';
import { ManageImagesComponent } from '../manage-images/manage-images.component';
import { CameraCaptureComponent } from '../camera-capture/camera-capture.component';
import { ServiceReport, Severity } from '../../models/service-report.model';
import {CameraNativeService} from '../../services/camera-native.service';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {ShareReceiverService} from '../../services/share-receiver.service';

@Component({
  selector: 'app-service-report-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatStepperModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CameraCaptureComponent,
  ],
  templateUrl: './service-report-form.component.html',
  styleUrl: './service-report-form.component.scss'
})
export class ServiceReportFormComponent implements OnInit {
  form!: FormGroup;
  isMobile = false;
  currentStep = 0;
  showCamera = false;
  severityOptions: Severity[] = ['None', 'Mild', 'Moderate', 'Severe'];

  constructor(
    private fb: FormBuilder,
    private breakpointObserver: BreakpointObserver,
    private imageService: ImageService,
    private shareReceiver: ShareReceiverService,
    private exportService: ExportService,
    private cameraNative: CameraNativeService,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    this.buildForm();
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => this.isMobile = result.matches);
    this.shareReceiver.init();
  }

  private setupShareListener() {
    if (!Capacitor.isNativePlatform()) return;

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('App activa – lista para recibir shares si el intent los entregó');
      }
    });
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

  private buildForm() {
    this.form = this.fb.group({
      client: this.fb.group({
        companyName: [''],
        phone: [''],
        mobile: [''],
        address: [''],
        email: [''],
        date: [new Date(), Validators.required]
      }),
      vehicle: this.fb.group({
        hourMeter: [''],
        mileage: [''],
        brand: [''],
        model: [''],
        licensePlate: ['']
      }),
      issues: this.fb.array([]),
      works: this.fb.array([]),
      recommendations: this.fb.array([]),
      observations: this.fb.array([])
    });

    // Add one empty item by default for each list
    /*
      this.addIssue();
      this.addWork();
      this.addRecommendation();
      this.addObservation();
    */
  }

  private async loadSharedImagesFromCache() {
    if (!('caches' in window)) return;

    try {
      const cache = await caches.open('share-target-v1');
      const metaRes = await cache.match('/__share_meta__');
      if (!metaRes) return;

      const meta = await metaRes.json();
      const count = meta.count || 0;

      for (let i = 0; i < count; i++) {
        const fileRes = await cache.match(`/__share_file__/${i}`);
        if (!fileRes) continue;

        const blob = await fileRes.blob();
        const filename = fileRes.headers.get('X-Filename') || `Compartida ${i + 1}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

        this.imageService.addImage(file, `Compartida ${i + 1}`);
      }

      // Limpiar para no volver a cargarlas
      const keys = await cache.keys();
      await Promise.all(keys.map((k) => cache.delete(k)));
    } catch (e) {
      console.error('Error cargando imágenes compartidas', e);
    }
  }

  // ===== Form Arrays helpers =====
  get issues() { return this.form.get('issues') as FormArray; }
  get works() { return this.form.get('works') as FormArray; }
  get recommendations() { return this.form.get('recommendations') as FormArray; }
  get observations() { return this.form.get('observations') as FormArray; }

  addIssue() {
    this.issues.push(this.fb.group({
      description: ['', Validators.required],
      severity: ['Moderate', Validators.required]
    }));
  }

  removeIssue(index: number) {
    this.issues.removeAt(index);
  }

  addWork() {
    this.works.push(this.fb.group({
      description: ['', Validators.required]
    }));
  }

  removeWork(index: number) {
    this.works.removeAt(index);
  }

  addRecommendation() {
    this.recommendations.push(this.fb.group({
      description: ['', Validators.required]
    }));
  }

  removeRecommendation(index: number) {
    this.recommendations.removeAt(index);
  }

  addObservation() {
    this.observations.push(this.fb.group({
      description: ['', Validators.required]
    }));
  }

  removeObservation(index: number) {
    this.observations.removeAt(index);
  }

  onAddItem() {
    switch (this.currentStep) {
      case 2: this.addIssue(); break;
      case 3: this.addWork(); break;
      case 4: this.addRecommendation(); break;
      case 5: this.addObservation(); break;
    }
  }

  // ===== Images =====
  openManageImages() {
    this.dialog.open(ManageImagesComponent, {
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh'
    });
  }

  openCamera() {
    this.showCamera = true;
  }

  onPhotoTaken(file: File) {
    this.imageService.addImage(file, 'Foto tomada');
    this.showCamera = false;
  }

  get images() {
    return this.imageService.getSnapshot();
  }

  // ===== Navigation (mobile) =====
  nextStep() {
    if (this.currentStep < 6) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 0) this.currentStep--;
  }

  // ===== Export =====
  async export(format: 'word' | 'pdf') {
    console.log('EXPORT CLICK', format);
    alert('Exportar ' + format);

    try {
      const formValue = this.form.getRawValue();

      const report = {
        client: formValue.client,
        vehicle: formValue.vehicle,
        issues: formValue.issues || [],
        works: formValue.works || [],
        recommendations: formValue.recommendations || [],
        observations: formValue.observations || [],
        images: this.imageService.getSnapshot()
      };

      console.log('REPORT', report);

      if (format === 'word') {
        await this.exportService.exportToWord(report);
      } else {
        await this.exportService.exportToPdf(report);
      }

      alert('Documento generado');
    } catch (e) {
      console.error('EXPORT ERROR', e);
      alert('Error exportando: ' + ((e as any)?.message || e));
    }
  }

  @HostListener('window:paste', ['$event'])
  async onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length === 0) return;

    // Evitar que el navegador pegue la imagen en otro lado
    event.preventDefault();

    // Agregar respetando el orden
    imageFiles.forEach((file, index) => {
      this.imageService.addImage(file, `Imagen pegada ${index + 1}`);
    });

    console.log(`${imageFiles.length} imagen(es) pegadas`);
  }
}
