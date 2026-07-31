import { Medication } from '@/patient-record/medication/domain/medication';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mirrors the dashboard's `Medication` type. `patientId` is intentionally
 * omitted — it's an internal reference, not part of the client shape.
 */
export class MedicationResponse {
  @ApiProperty({ example: '019fb978-44ca-751e-a5c3-b2a8928720e0' })
  id!: string;

  @ApiProperty({ example: 'Lisinopril' })
  name!: string;

  @ApiProperty({ example: '10mg' })
  dosage!: string;

  @ApiProperty({ example: 'Once daily in the morning' })
  frequency!: string;

  @ApiProperty({ example: 'oral' })
  route!: string;

  @ApiProperty({ example: '2023-06-01' })
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-01-10', nullable: true })
  endDate?: string | null;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiPropertyOptional({
    example: 'Monitor blood pressure regularly',
    nullable: true,
  })
  instructions?: string | null;

  static from(m: Medication): MedicationResponse {
    const res = new MedicationResponse();
    res.id = m.id;
    res.name = m.name;
    res.dosage = m.dosage;
    res.frequency = m.frequency;
    res.route = m.route;
    res.startDate = m.startDate;
    res.endDate = m.endDate;
    res.status = m.status;
    res.instructions = m.instructions;
    return res;
  }
}
