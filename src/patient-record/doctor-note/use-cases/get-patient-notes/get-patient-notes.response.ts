import { DoctorNote } from '@/patient-record/doctor-note/domain/doctor-note';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mirrors the dashboard's `DoctorNote` type, including the denormalized doctor
 * snapshot (doctorId / doctorName / specialty / doctorAvatar) so the client
 * renders the author without a second request.
 */
export class DoctorNoteResponse {
  @ApiProperty({ example: '019fb9e7-acdf-749d-be0f-d2d23f6b010f' })
  id!: string;

  @ApiProperty({ example: '0198b400-0004-7a04-8b04-0000000c0004' })
  patientId!: string;

  @ApiProperty({ example: 'doctor-123' })
  doctorId!: string;

  @ApiProperty({ example: 'Dr. Sarah Ahmed' })
  doctorName!: string;

  @ApiProperty({ example: 'Cardiology' })
  specialty!: string;

  @ApiProperty({ example: 'https://randomuser.me/api/portraits/women/44.jpg' })
  doctorAvatar!: string;

  @ApiProperty({ example: 'consultation' })
  type!: string;

  @ApiProperty({ example: 'Chest Pain Evaluation' })
  title!: string;

  @ApiProperty({ example: 'Patient presented with intermittent chest pain…' })
  content!: string;

  @ApiProperty({ example: '2024-10-12T10:45:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2024-10-12T11:10:00.000Z', nullable: true })
  updatedAt?: string | null;

  static from(n: DoctorNote): DoctorNoteResponse {
    const res = new DoctorNoteResponse();
    res.id = n.id;
    res.patientId = n.patientId;
    res.doctorId = n.doctorId;
    res.doctorName = n.doctorName;
    res.specialty = n.specialty;
    res.doctorAvatar = n.doctorAvatar;
    res.type = n.type;
    res.title = n.title;
    res.content = n.content;
    res.createdAt = n.createdAt;
    res.updatedAt = n.updatedAt;
    return res;
  }
}
