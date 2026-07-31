/**
 * Vaccine enums — shared by the domain and the DTOs (class-validator @IsEnum).
 */

export enum VaccineStatus {
  Completed = 'completed',
  Scheduled = 'scheduled',
  Overdue = 'overdue',
}
