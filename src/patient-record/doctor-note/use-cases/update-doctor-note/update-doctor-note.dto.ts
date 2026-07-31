import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NoteType } from '@/patient-record/doctor-note/domain';

/**
 * Update = note content fields ONLY (all optional). The doctor snapshot is set
 * once at creation and is intentionally NOT part of this DTO — a doctor cannot
 * re-send / overwrite their identity on edit. `forbidNonWhitelisted` makes any
 * doctor field in the body a 400.
 */
export class UpdateDoctorNoteDto {
  @ApiPropertyOptional({ enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType, {
    message: `type must be one of: ${Object.values(NoteType).join(', ')}`,
  })
  type?: NoteType;

  @ApiPropertyOptional({ example: 'Chest Pain Evaluation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated clinical assessment…' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content?: string;
}
