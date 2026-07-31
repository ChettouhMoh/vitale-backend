/**
 * Medication enums — shared by the domain and the DTOs (class-validator @IsEnum).
 * Simple closed sets, so they live here as plain enums rather than VOs.
 */

export enum MedicationRoute {
  Oral = 'oral',
  IV = 'iv',
  Injection = 'injection',
}

export enum MedicationStatus {
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
}
