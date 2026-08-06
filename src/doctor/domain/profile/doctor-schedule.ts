import { ScheduleDay, WeeklySchedule } from '../value-objects';

/** DoctorSchedule — its own document keyed by doctorId. */
export interface DoctorScheduleRecord {
  doctorId: string;
  schedule: ScheduleDay[];
  updatedAt: Date;
}

export class DoctorSchedule {
  private constructor(
    private readonly _doctorId: string,
    private _schedule: WeeklySchedule,
    private _updatedAt: Date,
  ) {}

  static createEmpty(doctorId: string): DoctorSchedule {
    return new DoctorSchedule(doctorId, WeeklySchedule.empty(), new Date());
  }

  static restoreExisting(record: DoctorScheduleRecord): DoctorSchedule {
    return new DoctorSchedule(
      record.doctorId,
      WeeklySchedule.create(record.schedule),
      record.updatedAt,
    );
  }

  toRecord(): DoctorScheduleRecord {
    return {
      doctorId: this._doctorId,
      schedule: this._schedule.days,
      updatedAt: this._updatedAt,
    };
  }

  replace(days: ScheduleDay[]): void {
    this._schedule = WeeklySchedule.create(days);
    this._updatedAt = new Date();
  }

  get doctorId(): string {
    return this._doctorId;
  }
  get schedule(): ScheduleDay[] {
    return this._schedule.days;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
}
