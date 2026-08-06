import { Controller, Put, Body, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { UpdateScheduleDto } from './update-schedule.dto';
import { DoctorSchedule } from '@/doctor/domain';
import { IDoctorScheduleRepository } from '@/doctor/ports';
import { CurrentDoctor } from '@/common/decorators/current-doctor.decorator';

class ScheduleDayOut {
  @ApiProperty() dayKey!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() status!: string;
}

export class ScheduleResponse {
  @ApiProperty() doctorId!: string;
  @ApiProperty({ type: [ScheduleDayOut] }) schedule!: ScheduleDayOut[];
  @ApiProperty() updatedAt!: string;

  static from(s: DoctorSchedule): ScheduleResponse {
    const r = new ScheduleResponse();
    r.doctorId = s.doctorId;
    r.schedule = s.schedule;
    r.updatedAt = s.updatedAt.toISOString();
    return r;
  }
}

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateScheduleController {
  constructor(
    @Inject(IDoctorScheduleRepository)
    private readonly schedule: IDoctorScheduleRepository,
  ) {}

  @Put('me/schedule')
  @ApiOperation({ summary: 'Replace the whole weekly schedule' })
  @ApiBody({ type: UpdateScheduleDto })
  @ApiResponse({ status: 200, type: ScheduleResponse })
  @ApiResponse({
    status: 400,
    description: 'Duplicate day or invalid time range',
  })
  async execute(
    @CurrentDoctor() doctorId: string,
    @Body() dto: UpdateScheduleDto,
  ): Promise<ScheduleResponse> {
    const doc =
      (await this.schedule.findByDoctorId(doctorId)) ??
      DoctorSchedule.createEmpty(doctorId);
    doc.replace(dto.schedule);
    await this.schedule.save(doc);
    return ScheduleResponse.from(doc);
  }
}
