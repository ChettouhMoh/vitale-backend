/**
 * Doctor-note enums — shared by the domain and the DTOs (class-validator @IsEnum).
 */

export enum NoteType {
  Progress = 'progress',
  Consultation = 'consultation',
  Discharge = 'discharge',
  Emergency = 'emergency',
  FollowUp = 'follow-up',
}
