import { Injectable } from '@angular/core';
import { ServiceReport } from '../models/service-report.model';

@Injectable({ providedIn: 'root' })
export class ExportService {

  // ===================== WORD =====================
  async exportToWord(report: ServiceReport) {
    try {
      // Carga dinámica compatible con producción
      const PizZipModule = await import('pizzip');
      const DocxtemplaterModule = await import('docxtemplater');
      const ImageModuleModule = await import('docxtemplater-image-module-free');
      const FileSaverModule = await import('file-saver');

      // Normalizar default exports (necesario en build de producción)
      const PizZip = (PizZipModule as any).default || PizZipModule;
      const Docxtemplater = (DocxtemplaterModule as any).default || DocxtemplaterModule;
      const ImageModule = (ImageModuleModule as any).default || ImageModuleModule;
      const saveAs = (FileSaverModule as any).saveAs || (FileSaverModule as any).default?.saveAs || (FileSaverModule as any).default;

      // 1. Cargar plantilla
      const response = await fetch(this.getTemplateUrl());
      if (!response.ok) {
        throw new Error(`No se pudo cargar la plantilla (${response.status})`);
      }

      const templateArrayBuffer = await response.arrayBuffer();

      const uint8 = new Uint8Array(templateArrayBuffer);
      if (uint8[0] !== 0x50 || uint8[1] !== 0x4B) {
        throw new Error('El archivo de plantilla no es un .docx válido');
      }

      const zip = new PizZip(templateArrayBuffer);

      // 2. Módulo de imágenes
      const imageOpts = {
        centered: true,
        fileType: 'docx' as const,
        getImage: (tagValue: string) => this.base64ToUint8Array(tagValue),
        getSize: (img: any, _tagValue: string, tagName: string): [number, number] => {
          const isFirst = tagName === 'firstImage';
          const maxW = 687;
          const maxH = isFirst ? 720 : 400;

          // Si no hay dimensiones, usa el recuadro
          const w = img?.width || maxW;
          const h = img?.height || maxH;

          const scale = Math.min(maxW / w, maxH / h, 1);
          return [Math.round(w * scale), Math.round(h * scale)];
        }
      };

      const imageModule = new ImageModule(imageOpts);

      // 3. Docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule]
      });

      // 4. Preparar imágenes
      const sortedImages = [...(report.images || [])].sort((a, b) => a.order - b.order);

      const imagesBase64: string[] = [];
      for (const img of sortedImages) {
        if (!img.file) continue;
        imagesBase64.push(await this.fileToBase64(img.file));
      }

      const firstImage = imagesBase64[0] || null;
      const rest = imagesBase64.slice(1);

      const imagePages: Array<{
        img1: string | null;
        img2: string | null;
      }> = [];

      for (let i = 0; i < rest.length; i += 2) {
        imagePages.push({
          img1: rest[i] || null,
          img2: rest[i + 1] || null
        });
      }

      // 5. Datos
      const data = {
        companyName: report.client?.companyName || '',
        address: report.client?.address || '',
        phone: report.client?.phone || '',
        mobile: report.client?.mobile || '',
        email: report.client?.email || '',
        date: this.formatDate(report.client?.date),
        hourMeter: report.vehicle?.hourMeter || '',
        mileage: report.vehicle?.mileage || '',
        brand: report.vehicle?.brand || '',
        model: report.vehicle?.model || '',
        licensePlate: report.vehicle?.licensePlate || '',
        issues: (report.issues || []).map(i => ({
          description: i.description || '',
          severity: (i.severity || '').toUpperCase()
        })),
        works: (report.works || []).map(w => ({
          description: w.description || ''
        })),
        recommendations: (report.recommendations || []).map(r => ({
          description: r.description || ''
        })),
        observations: (report.observations || []).map(o => ({
          description: o.description || ''
        })),
        firstImage,
        hasFirstImage: !!firstImage,
        imagePages,
      };

      // 6. Render
      doc.render(data);

      // 7. Descargar
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const fileName = `Informe_Tecnico_${report.vehicle?.licensePlate || 'SIN_PLACA'}_${this.formatDate(report.client?.date)}.docx`;
      this.saveAndShare(output, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    } catch (error) {
      console.error('Error generando Word:', error);
      alert('Error al generar el documento Word. Revisa la consola para más detalles.');
      throw error;
    }
  }

  // ===================== PDF =====================
  async exportToPdf(report: ServiceReport) {
    try {
      // Carga dinámica
      const pdfLib = await import('pdf-lib');
      const FileSaverModule = await import('file-saver');

      const { PDFDocument, rgb, StandardFonts } = pdfLib;
      const saveAs = (FileSaverModule as any).saveAs || (FileSaverModule as any).default?.saveAs || (FileSaverModule as any).default;

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595;
      const pageHeight = 842;
      const margin = 40;

      // ---- Página de datos ----
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - 50;

      // Título
      page.drawText('INFORME TÉCNICO VEHICULAR', {
        x: margin,
        y,
        size: 16,
        font: fontBold,
        color: rgb(0.12, 0.29, 0.56)
      });
      y -= 30;

      // Datos del cliente
      y = this.drawSectionHeaderPdf(page, 'DATOS DEL CLIENTE', margin, y, pageWidth, fontBold);
      y = this.drawKeyValue(page, 'NOMBRE DE LA EMPRESA:', report.client?.companyName || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'DIRECCIÓN:', report.client?.address || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'TELÉFONO:', report.client?.phone || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'CELULAR:', report.client?.mobile || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'CORREO ELECTRÓNICO:', report.client?.email || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'FECHA:', this.formatDate(report.client?.date), margin, y, font, fontBold);
      y -= 12;

      // Datos del vehículo
      y = this.drawSectionHeaderPdf(page, 'DATOS DEL VEHÍCULO', margin, y, pageWidth, fontBold);
      y = this.drawKeyValue(page, 'HORÓMETRO:', report.vehicle?.hourMeter || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'KILOMETRAJE:', report.vehicle?.mileage || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'MARCA:', report.vehicle?.brand || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'MODELO:', report.vehicle?.model || '-', margin, y, font, fontBold);
      y = this.drawKeyValue(page, 'PLACA DE RODAJE:', report.vehicle?.licensePlate || '-', margin, y, font, fontBold);
      y -= 12;

      // Inconvenientes
      y = this.drawSectionHeaderPdf(page, 'INCONVENIENTE ENCONTRADO', margin, y, pageWidth, fontBold);
      for (const item of report.issues || []) {
        if (y < 80) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - 50;
        }
        const severity = item.severity ? ` (${item.severity.toUpperCase()})` : '';
        const isSevere = ['severe', 'grave'].includes((item.severity || '').toLowerCase());
        const text = `- ${item.description}${severity}`;
        page.drawText(text.substring(0, 95), {
          x: margin,
          y,
          size: 9,
          font,
          color: isSevere ? rgb(0.75, 0, 0) : rgb(0.1, 0.1, 0.1)
        });
        y -= 13;
      }
      y -= 8;

      // Trabajos
      y = this.drawSectionHeaderPdf(page, 'TRABAJOS EFECTUADOS', margin, y, pageWidth, fontBold);
      for (const item of report.works || []) {
        if (y < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - 50;
        }
        page.drawText(`- ${item.description}`.substring(0, 95), {
          x: margin, y, size: 9, font, color: rgb(0.1, 0.1, 0.1)
        });
        y -= 13;
      }
      y -= 8;

      // Recomendaciones
      y = this.drawSectionHeaderPdf(page, 'RECOMENDACIONES TÉCNICAS', margin, y, pageWidth, fontBold);
      for (const item of report.recommendations || []) {
        if (y < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - 50;
        }
        page.drawText(`- ${item.description}`.substring(0, 95), {
          x: margin, y, size: 9, font, color: rgb(0.1, 0.1, 0.1)
        });
        y -= 13;
      }
      y -= 8;

      // Observaciones
      y = this.drawSectionHeaderPdf(page, 'OBSERVACIONES', margin, y, pageWidth, fontBold);
      for (const item of report.observations || []) {
        if (y < 60) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - 50;
        }
        page.drawText(`- ${item.description}`.substring(0, 95), {
          x: margin, y, size: 9, font, color: rgb(0.1, 0.1, 0.1)
        });
        y -= 13;
      }

      // ---- Imágenes ----
      const sorted = [...(report.images || [])].sort((a, b) => a.order - b.order);

      for (let i = 0; i < sorted.length; i++) {
        const img = sorted[i];
        if (!img.file) continue;

        const bytes = await this.fileToArrayBuffer(img.file);
        let embedded;
        try {
          embedded = await pdfDoc.embedJpg(bytes);
        } catch {
          embedded = await pdfDoc.embedPng(bytes);
        }

        if (i === 0) {
          // Página completa: solo la primera
          page = pdfDoc.addPage([pageWidth, pageHeight]);

          const maxW = pageWidth - margin * 2;      // 515
          const maxH = pageHeight - 120;            // ~722
          const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
          const w = embedded.width * scale;
          const h = embedded.height * scale;

          page.drawImage(embedded, {
            x: (pageWidth - w) / 2,
            y: (pageHeight - h) / 2,
            width: w,
            height: h
          });
          continue;
        }

        // Resto: índice 1,2,3,4... → pares de 2
        const restIndex = i - 1;          // 0,1,2,3...
        const posInPage = restIndex % 2;  // 0 arriba, 1 abajo

        if (posInPage === 0) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
        }

        const maxW = pageWidth - margin * 2;
        const maxH = 320; // para que quepan 2
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
        const w = embedded.width * scale;
        const h = embedded.height * scale;

        const yTop = pageHeight - 50 - h;
        const yBottom = 50;
        const yPos = posInPage === 0 ? yTop : yBottom;

        page.drawImage(embedded, {
          x: (pageWidth - w) / 2,
          y: yPos,
          width: w,
          height: h
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const fileName = `Informe_Tecnico_${report.vehicle?.licensePlate || 'SIN_PLACA'}_${this.formatDate(report.client?.date)}.pdf`;
      await this.saveAndShare(blob, fileName, 'application/pdf');

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Revisa la consola para más detalles.');
      throw error;
    }
  }

  private async saveAndShare(blob: Blob, fileName: string, mimeType: string) {
    if (!Capacitor.isNativePlatform()) {
      const { saveAs } = await import('file-saver');
      const save = (saveAs as any).saveAs || (saveAs as any).default || saveAs;
      save(blob, fileName);
      return;
    }

    const base64 = await this.blobToBase64(blob);

    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: fileName,
      url: saved.uri,
      dialogTitle: 'Compartir o guardar documento'
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ===================== HELPERS =====================

  private getTemplateUrl(): string {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.convertFileSrc('assets/templates/informe-tecnico-template.docx');
      // si falla, prueba:
      // return 'assets/templates/informe-tecnico-template.docx';
    }
    return 'assets/templates/informe-tecnico-template.docx';
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // solo la parte base64
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private drawSectionHeaderPdf(
    page: any,
    text: string,
    x: number,
    y: number,
    pageWidth: number,
    fontBold: any
  ): number {
    const width = pageWidth - x * 2;
    page.drawRectangle({
      x,
      y: y - 4,
      width,
      height: 18,
      color: rgb(0.12, 0.29, 0.56)
    });
    page.drawText(text, {
      x: x + 6,
      y,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1)
    });
    return y - 22;
  }

  private drawKeyValue(
    page: any,
    label: string,
    value: string,
    x: number,
    y: number,
    font: any,
    fontBold: any
  ): number {
    page.drawText(label, {
      x,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15)
    });
    page.drawText(value || '-', {
      x: x + 140,
      y,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1)
    });
    return y - 14;
  }
}

// Necesario para el helper de PDF (rgb se usa en métodos privados)
import { rgb } from 'pdf-lib';
import {Directory, Filesystem} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {Capacitor} from '@capacitor/core';
