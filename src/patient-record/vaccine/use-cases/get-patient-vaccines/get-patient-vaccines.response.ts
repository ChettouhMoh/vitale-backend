import { Vaccine } from '@/patient-record/vaccine/domain/vaccine';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mirrors the dashboard's `Vaccine` type. `patientId` is intentionally omitted —
 * it's an internal reference, not part of the client shape.
 */
export class VaccineResponse {
  @ApiProperty({ example: '019fb995-42b1-77eb-b32f-23dde37348b7' })
  id!: string;

  @ApiProperty({ example: 'Influenza' })
  name!: string;

  @ApiProperty({ example: 'Annual' })
  dose!: string;

  @ApiProperty({ example: 'completed' })
  status!: string;

  @ApiPropertyOptional({ example: '2024-10-05', nullable: true })
  dateGiven?: string | null;

  @ApiProperty({ example: '2024-10-05' })
  dueDate!: string;

  @ApiProperty({ example: 'General Hospital' })
  location!: string;

  @ApiPropertyOptional({ example: 'Seasonal flu shot', nullable: true })
  notes?: string | null;

  @ApiProperty({ example: '2024-10-01T00:00:00.000Z' })
  createdAt!: string;

  static from(v: Vaccine): VaccineResponse {
    const res = new VaccineResponse();
    res.id = v.id;
    res.name = v.name;
    res.dose = v.dose;
    res.status = v.status;
    res.dateGiven = v.dateGiven;
    res.dueDate = v.dueDate;
    res.location = v.location;
    res.notes = v.notes;
    res.createdAt = v.createdAt;
    return res;
  }
}
