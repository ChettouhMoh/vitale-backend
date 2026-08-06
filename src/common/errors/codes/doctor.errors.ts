// The doctor bounded context owns its error codes; re-exported here so they
// join the global `ErrorCode` union without a second declaration.
export { DoctorErrorCode } from '@/doctor/domain/doctor.errors';
