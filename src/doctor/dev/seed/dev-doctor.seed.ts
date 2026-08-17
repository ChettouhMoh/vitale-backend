import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import {
  AccountStatusValue,
  DayKey,
  DoctorBio,
  DoctorEducation,
  DoctorExpertise,
  DoctorLanguages,
  DoctorSchedule,
  ScheduleDayStatus,
  VerificationStatusValue,
  WorkplaceType,
  Doctor,
} from '@/doctor/domain';
import {
  IDoctorBioRepository,
  IDoctorEducationRepository,
  IDoctorExpertiseRepository,
  IDoctorLanguagesRepository,
  IDoctorRepository,
  IDoctorScheduleRepository,
} from '@/doctor/ports';

/**
 * DEV-ONLY. Seeds the in-memory doctor store with the same mock account the
 * dashboard uses locally, so `POST /auth/doctor/login` + `GET /auth/me` +
 * `/doctors/me/profile` work end-to-end against the real backend.
 *
 * The password is hashed with argon2id at startup (via the same algorithm the
 * production `Argon2PasswordHasher` uses), so login's `hasher.verify` accepts it.
 * The dev JWT secrets in `.env` are shared placeholders (fine for a single local
 * instance); rotate them before any real deployment.
 *
 * Skipped entirely in production — this only touches in-memory repos.
 */
const DOCTOR_ID = 'doctor-123';
const DEMO_EMAIL = 'mohchettouh80@gmail.com';
const DEMO_NAME = 'Mohamed Chettouh';
const DEMO_PASSWORD = 'VitaleDemo123!';
const DEMO_PHONE = '+213555123456';
const DEMO_SPECIALTY = 'Cardiology';
const DEMO_LICENSE = 'DZ-MED-123456';
const PRACTICE_START_YEAR = 2020;

const BIO_TEXT =
  'Board-certified cardiologist with over 5 years of clinical experience ' +
  'specializing in interventional cardiology and heart failure management. ' +
  'Dedicated to evidence-based practice and patient-centered care, with a ' +
  'focus on preventive cardiology and complex coronary interventions.';

const EXPERTISE = [
  'Interventional Cardiology',
  'Heart Failure',
  'Echocardiography',
  'Preventive Cardiology',
  'Coronary Angioplasty',
  'Arrhythmia Management',
];

const LANGUAGES = ['English', 'French', 'Arabic'];

const EDUCATION = [
  {
    degree: 'MD, Medicine',
    institution: 'Faculty of Medicine, Algiers',
    year: '2017',
  },
  {
    degree: 'Residency, Cardiology',
    institution: 'CHU Mustapha Pacha',
    year: '2020',
  },
  {
    degree: 'Fellowship, Interventional Cardiology',
    institution: 'Vitale Medical Center',
    year: '2022',
  },
];

// Mirrors the dashboard's userStore schedule mock (HH:mm on active days).
const SCHEDULE: {
  dayKey: DayKey;
  active: boolean;
  startTime: string;
  endTime: string;
  status: ScheduleDayStatus;
}[] = [
  {
    dayKey: DayKey.Mon,
    active: true,
    startTime: '09:00',
    endTime: '17:00',
    status: ScheduleDayStatus.Working,
  },
  {
    dayKey: DayKey.Tue,
    active: true,
    startTime: '09:00',
    endTime: '17:00',
    status: ScheduleDayStatus.Working,
  },
  {
    dayKey: DayKey.Wed,
    active: true,
    startTime: '09:00',
    endTime: '13:00',
    status: ScheduleDayStatus.Working,
  },
  {
    dayKey: DayKey.Thu,
    active: true,
    startTime: '09:00',
    endTime: '17:00',
    status: ScheduleDayStatus.Working,
  },
  {
    dayKey: DayKey.Fri,
    active: true,
    startTime: '09:00',
    endTime: '16:00',
    status: ScheduleDayStatus.Working,
  },
  {
    dayKey: DayKey.Sat,
    active: false,
    startTime: '',
    endTime: '',
    status: ScheduleDayStatus.OnCall,
  },
  {
    dayKey: DayKey.Sun,
    active: false,
    startTime: '',
    endTime: '',
    status: ScheduleDayStatus.Off,
  },
];

@Injectable()
export class DevDoctorSeed implements OnModuleInit {
  private readonly log = new Logger(DevDoctorSeed.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(IDoctorRepository) private readonly doctors: IDoctorRepository,
    @Inject(IDoctorBioRepository) private readonly bios: IDoctorBioRepository,
    @Inject(IDoctorExpertiseRepository)
    private readonly expertise: IDoctorExpertiseRepository,
    @Inject(IDoctorLanguagesRepository)
    private readonly languages: IDoctorLanguagesRepository,
    @Inject(IDoctorEducationRepository)
    private readonly education: IDoctorEducationRepository,
    @Inject(IDoctorScheduleRepository)
    private readonly schedule: IDoctorScheduleRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('NODE_ENV') === 'production') return;

    const existing = await this.doctors.findByEmail(DEMO_EMAIL);
    if (existing) {
      this.log.warn(
        `Dev seed skipped — doctor "${DEMO_EMAIL}" already exists (id=${existing.id})`,
      );
      return;
    }

    const now = new Date();
    const passwordHash = await argon2.hash(DEMO_PASSWORD, {
      type: argon2.argon2id,
    });

    const doctor = Doctor.restoreExisting({
      id: DOCTOR_ID,
      email: DEMO_EMAIL,
      passwordHash,
      emailVerified: true,
      fullName: DEMO_NAME,
      phone: DEMO_PHONE,
      avatarAttachmentId: null,
      specialty: DEMO_SPECIALTY,
      medicalLicenseNumber: DEMO_LICENSE,
      practiceStartYear: PRACTICE_START_YEAR,
      affiliationName: null,
      affiliationType: WorkplaceType.Independent,
      affiliationDepartment: null,
      clinicAddress: null,
      kycActivityType: null,
      accountStatus: AccountStatusValue.Active,
      verificationStatus: VerificationStatusValue.Unverified,
      verificationRejectionReason: null,
      verifiedBy: null,
      createdAt: now,
      updatedAt: now,
    });
    await this.doctors.save(doctor);

    await this.bios.save(
      DoctorBio.restoreExisting({
        doctorId: DOCTOR_ID,
        bio: BIO_TEXT,
        updatedAt: now,
      }),
    );
    await this.expertise.save(
      DoctorExpertise.restoreExisting({
        doctorId: DOCTOR_ID,
        expertise: EXPERTISE,
        updatedAt: now,
      }),
    );
    await this.languages.save(
      DoctorLanguages.restoreExisting({
        doctorId: DOCTOR_ID,
        languages: LANGUAGES,
        updatedAt: now,
      }),
    );
    await this.education.save(
      DoctorEducation.restoreExisting({
        doctorId: DOCTOR_ID,
        education: EDUCATION,
        updatedAt: now,
      }),
    );
    await this.schedule.save(
      DoctorSchedule.restoreExisting({
        doctorId: DOCTOR_ID,
        schedule: SCHEDULE,
        updatedAt: now,
      }),
    );

    this.log.log(
      `Seeded dev doctor "${DEMO_EMAIL}" (id=${DOCTOR_ID}, password="${DEMO_PASSWORD}")`,
    );
  }
}
