export { AuthErrorCode } from './auth.errors';
export { DoctorErrorCode } from './doctor.errors';
export { PatientErrorCode } from './patient.errors';
export { MedicationErrorCode } from './medication.errors';
export { VaccineErrorCode } from './vaccine.errors';
export { DoctorNoteErrorCode } from './doctor-note.errors';
export { NfcErrorCode } from './nfc.errors';

import { AuthErrorCode } from './auth.errors';
import { DoctorErrorCode } from './doctor.errors';
import { PatientErrorCode } from './patient.errors';
import { MedicationErrorCode } from './medication.errors';
import { VaccineErrorCode } from './vaccine.errors';
import { DoctorNoteErrorCode } from './doctor-note.errors';
import { NfcErrorCode } from './nfc.errors';

/**
 * Union of every domain-specific error code in the platform.
 * Add new product/domain enums above and extend this union when they land.
 */
export type ErrorCode =
  | AuthErrorCode
  | DoctorErrorCode
  | PatientErrorCode
  | MedicationErrorCode
  | VaccineErrorCode
  | DoctorNoteErrorCode
  | NfcErrorCode;
