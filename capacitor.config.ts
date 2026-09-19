import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'arc.reporte.servicio.app',
  appName: 'reporte-servicio',
  webDir: 'dist/reporte-servicio/browser',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
