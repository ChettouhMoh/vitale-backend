// Imported via the `@/` alias on purpose — exercises Jest's moduleNameMapper.
import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '@/common/errors/codes';

describe('DomainError', () => {
  it('carries the error code and message', () => {
    const error = new DomainError(
      DoctorErrorCode.DOCTOR_NOT_FOUND,
      'Doctor not found',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(DoctorErrorCode.DOCTOR_NOT_FOUND);
    expect(error.message).toBe('Doctor not found');
    expect(error.name).toBe('DomainError');
  });
});
