import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NoteType } from '@/patient-record/doctor-note/domain';

/**
 * Add-note body = note content + the denormalized doctor snapshot. The frontend
 * fills the doctor fields from the signed-in user's store; the backend stores
 * them on the note (see the denormalization note in the domain).
 */
export class AddDoctorNoteDto {
  // ── Denormalized doctor snapshot ──
  @ApiProperty({ example: 'doctor-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  doctorId!: string;

  @ApiProperty({ example: 'Dr. Sarah Ahmed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  doctorName!: string;

  // specialty / avatar may legitimately be empty for a freshly-registered doctor.
  @ApiProperty({ example: 'Cardiology' })
  @IsString()
  @MaxLength(150)
  specialty!: string;

  @ApiProperty({ example: 'https://randomuser.me/api/portraits/women/44.jpg' })
  @IsString()
  @MaxLength(1000)
  doctorAvatar!: string;

  // ── Note content ──
  @ApiProperty({ enum: NoteType, example: NoteType.Consultation })
  @IsEnum(NoteType, {
    message: `type must be one of: ${Object.values(NoteType).join(', ')}`,
  })
  type!: NoteType;

  @ApiProperty({ example: 'Chest Pain Evaluation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Patient presented with intermittent chest pain…' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
