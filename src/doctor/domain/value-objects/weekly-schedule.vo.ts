import { DomainError } from '@/common/errors/domain.error';
import { DoctorErrorCode } from '../doctor.errors';

export enum DayKey {
  Mon = 'mon',
  Tue = 'tue',
  Wed = 'wed',
  Thu = 'thu',
  Fri = 'fri',
  Sat = 'sat',
  Sun = 'sun',
}

export enum ScheduleDayStatus {
  Working = 'working',
  OnCall = 'onCall',
  Off = 'off',
}

export interface ScheduleDay {
  dayKey: DayKey;
  active: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: ScheduleDayStatus;
}

const DAY_ORDER: DayKey[] = [
  DayKey.Mon,
  DayKey.Tue,
  DayKey.Wed,
  DayKey.Thu,
  DayKey.Fri,
  DayKey.Sat,
  DayKey.Sun,
];

/**
 * WeeklySchedule — immutable collection of at most 7 day entries. The DTO
 * validates the `HH:mm` format and the enums; this VO owns uniqueness, the
 * active-day time range, and canonical (mon→sun) ordering.
 */
export class WeeklySchedule {
  private constructor(private readonly _days: ReadonlyArray<ScheduleDay>) {}

  static empty(): WeeklySchedule {
    return new WeeklySchedule([]);
  }

  static create(days: ScheduleDay[]): WeeklySchedule {
    const seen = new Set<DayKey>();

    for (const day of days) {
      if (seen.has(day.dayKey)) {
        throw new DomainError(
          DoctorErrorCode.DUPLICATE_SCHEDULE_DAY,
          `Duplicate schedule entry for ${day.dayKey}`,
        );
      }
      seen.add(day.dayKey);

      // Only active days constrain the time range; inactive days ignore times.
      if (day.active && !(day.endTime > day.startTime)) {
        throw new DomainError(
          DoctorErrorCode.INVALID_SCHEDULE_RANGE,
          `endTime must be after startTime on ${day.dayKey} (${day.startTime}–${day.endTime})`,
        );
      }
    }

    const sorted = [...days].sort(
      (a, b) => DAY_ORDER.indexOf(a.dayKey) - DAY_ORDER.indexOf(b.dayKey),
    );
    return new WeeklySchedule(sorted);
  }

  replaceAll(days: ScheduleDay[]): WeeklySchedule {
    return WeeklySchedule.create(days);
  }

  forDay(dayKey: DayKey): ScheduleDay | null {
    return this._days.find((d) => d.dayKey === dayKey) ?? null;
  }

  get days(): ScheduleDay[] {
    return this._days.map((d) => ({ ...d }));
  }
  get isEmpty(): boolean {
    return this._days.length === 0;
  }
}
