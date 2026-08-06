import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  ValidateIf,
  IsEnum,
  IsBoolean,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayKey, ScheduleDayStatus } from '@/doctor/domain';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ScheduleDayDto {
  @ApiProperty({ enum: DayKey, example: DayKey.Mon })
  @IsEnum(DayKey, {
    message: `dayKey must be one of: ${Object.values(DayKey).join(', ')}`,
  })
  dayKey!: DayKey;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;

  // Times are only validated for active days; an inactive day ignores them
  // (the frontend sends "" for off days).
  @ApiProperty({ example: '09:00' })
  @ValidateIf((o: ScheduleDayDto) => o.active === true)
  @IsString()
  @Matches(HH_MM, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @ValidateIf((o: ScheduleDayDto) => o.active === true)
  @IsString()
  @Matches(HH_MM, { message: 'endTime must be HH:mm' })
  endTime!: string;

  @ApiProperty({ enum: ScheduleDayStatus, example: ScheduleDayStatus.Working })
  @IsEnum(ScheduleDayStatus, {
    message: `status must be one of: ${Object.values(ScheduleDayStatus).join(', ')}`,
  })
  status!: ScheduleDayStatus;
}

export class UpdateScheduleDto {
  @ApiProperty({ type: [ScheduleDayDto] })
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  schedule!: ScheduleDayDto[];
}
