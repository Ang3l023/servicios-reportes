export interface Client {
  companyName: string;
  phone?: string;
  mobile?: string;
  address: string;
  email?: string;
  date: string; // ISO or dd/MM/yyyy
}

export interface Vehicle {
  hourMeter: string;
  mileage: string;
  brand: string;
  model: string;
  licensePlate: string;
}

export type Severity = 'None' | 'Mild' | 'Moderate' | 'Severe';

export interface Issue {
  id: number;
  description: string;
  severity: Severity;
}

export interface WorkPerformed {
  id: number;
  description: string;
}

export interface Recommendation {
  id: number;
  description: string;
}

export interface Observation {
  id: number;
  description: string;
}

export interface ReportImage {
  id: string;
  file?: File;
  previewUrl: string;
  label: string;          // e.g. "Front wheel", "Engine", etc.
  order: number;
  sizeKB: number;
}

export interface ServiceReport {
  client: Client;
  vehicle: Vehicle;
  issues: Issue[];
  works: WorkPerformed[];
  recommendations: Recommendation[];
  observations: Observation[];
  images: ReportImage[];
}
