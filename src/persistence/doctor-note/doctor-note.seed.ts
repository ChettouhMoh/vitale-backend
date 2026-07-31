import { DoctorNoteRecord } from '@/patient-record/doctor-note/domain/doctor-note';

/**
 * Doctor notes migrated from the dashboard mock
 * (vitale-dashboard/src/shared/api/doctor-notes.api.ts). Each note carries its
 * denormalized doctor snapshot (doctorId / doctorName / specialty / doctorAvatar).
 * Ids are UUID v7; timestamps are ISO strings.
 */
export const DOCTOR_NOTE_SEED: DoctorNoteRecord[] = [
  // ── Amine Chettouh (0198b400-0004…) ──────────────────────────────────────
  {
    id: '019fb9e7-acdf-749d-be0f-d2d23f6b010f',
    patientId: '0198b400-0004-7a04-8b04-0000000c0004',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Ahmed',
    specialty: 'Cardiology',
    doctorAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    type: 'consultation',
    title: 'Chest Pain Evaluation',
    content:
      'Patient presented with intermittent chest pain over the past 3 days. Pain described as pressure-like, radiating to left arm. No shortness of breath. ECG normal. Troponin negative. Recommended stress test and cardiology follow-up in 2 weeks.',
    createdAt: '2024-10-12T10:45:00.000Z',
    updatedAt: '2024-10-12T11:10:00.000Z',
  },
  {
    id: '019fb9e7-ace3-77ee-9847-16b9acbe0c9f',
    patientId: '0198b400-0004-7a04-8b04-0000000c0004',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Ahmed',
    specialty: 'Cardiology',
    doctorAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    type: 'follow-up',
    title: 'Hypertension Review',
    content:
      'Blood pressure well controlled on Lisinopril 10mg. Home readings averaging 128/82. Encouraged low-sodium diet and regular exercise. Continue current dose; recheck in 3 months.',
    createdAt: '2024-10-05T09:00:00.000Z',
    updatedAt: null,
  },

  // ── Soulaf Ayad (0198b400-0001…) ─────────────────────────────────────────
  {
    id: '019fb9e7-ace3-77ee-9847-1aec3067c1fc',
    patientId: '0198b400-0001-7a01-8b01-0000000c0001',
    doctorId: 'doc-002',
    doctorName: 'Dr. James Lee',
    specialty: 'Pediatrics',
    doctorAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    type: 'progress',
    title: 'Annual Well-Child Visit',
    content:
      '12-year-old girl. Growth on the 60th percentile for height and weight. Development age-appropriate. Asthma stable on Montelukast + as-needed inhaler. Reviewed inhaler technique with patient and parent. Vaccines mostly up to date — DTaP booster overdue, HPV dose 1 scheduled.',
    createdAt: '2024-11-18T14:20:00.000Z',
    updatedAt: null,
  },
  {
    id: '019fb9e7-ace4-755e-99b4-3f6dd19a414e',
    patientId: '0198b400-0001-7a01-8b01-0000000c0001',
    doctorId: 'doc-003',
    doctorName: 'Dr. Maria Garcia',
    specialty: 'Emergency Medicine',
    doctorAvatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    type: 'emergency',
    title: 'Acute Asthma Exacerbation',
    content:
      'Presented with wheezing and mild respiratory distress after a respiratory infection. Nebulized salbutamol given with good response. Oral course of amoxicillin prescribed for concurrent otitis media. Discharged with an updated asthma action plan and pediatric follow-up.',
    createdAt: '2024-04-02T22:15:00.000Z',
    updatedAt: null,
  },

  // ── Sofia Bennani (0198b400-0002…) ───────────────────────────────────────
  {
    id: '019fb9e7-ace4-755e-99b4-436c5b5c27a7',
    patientId: '0198b400-0002-7a02-8b02-0000000c0002',
    doctorId: 'doc-004',
    doctorName: 'Dr. Omar Idrissi',
    specialty: 'Endocrinology',
    doctorAvatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    type: 'follow-up',
    title: 'Thyroid Function Review',
    content:
      'Hypothyroidism controlled on Levothyroxine 75mcg. Latest TSH within target range. Reports improved energy. Iron supplementation paused due to GI upset — advised to take with food and reassess ferritin in 6 weeks.',
    createdAt: '2024-09-30T11:00:00.000Z',
    updatedAt: null,
  },

  // ── Yanis Meziane (0198b400-0003…) ───────────────────────────────────────
  {
    id: '019fb9e7-ace5-728b-a760-38499e39dee2',
    patientId: '0198b400-0003-7a03-8b03-0000000c0003',
    doctorId: 'doc-004',
    doctorName: 'Dr. Omar Idrissi',
    specialty: 'Pediatric Endocrinology',
    doctorAvatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    type: 'follow-up',
    title: 'Type 1 Diabetes Follow-up',
    content:
      '12-year-old boy with type 1 diabetes since 2022. HbA1c 7.6%, improving. On basal-bolus insulin (glargine + aspart). Reviewed carbohydrate counting and injection-site rotation with patient and parent. Sensor data shows good overnight control — continue current regimen.',
    createdAt: '2025-11-20T10:30:00.000Z',
    updatedAt: null,
  },
  {
    id: '019fb9e7-ace5-728b-a760-3ce40fd01658',
    patientId: '0198b400-0003-7a03-8b03-0000000c0003',
    doctorId: 'doc-002',
    doctorName: 'Dr. James Lee',
    specialty: 'Pediatrics',
    doctorAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    type: 'progress',
    title: 'Annual Well-Child Visit',
    content:
      'Growth tracking along the 55th percentile; development age-appropriate. Diabetes well managed. Seasonal allergic rhinitis controlled with as-needed cetirizine. Due for HPV dose 1 and an overdue meningococcal ACWY — both discussed with the parent.',
    createdAt: '2025-09-02T14:00:00.000Z',
    updatedAt: null,
  },
];
