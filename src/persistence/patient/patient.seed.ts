import { PatientRecord } from '@/patient-record/patient/domain/patient';

/**
 * Demo patient directory migrated verbatim from the dashboard mock
 * (vitale-dashboard/src/shared/api/patient.api.ts). Keyed by UUID v7 — the same
 * id written to the NFC card (block 4) and echoed as `patientId` on scan.
 *
 * NOTE: card-1's avatar seed reads "Lina Haddad" while the canonical name is
 * "Soulaf Ayad" — preserved as-is from the mock (known inconsistency).
 */
export const PATIENT_SEED: PatientRecord[] = [
  {
    id: '0198b400-0004-7a04-8b04-0000000c0004',
    name: 'Amine Chettouh',
    dateOfBirth: '1980-03-15',
    gender: 'male',
    bloodType: 'O+',
    nationalId: '198003151234567890',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Amine%20Chettouh',
    allergies: ['Peanuts', 'Shellfish'],
    chronicDiseases: ['Hypertension'],
    emergencyContact: { name: 'Ahmed Chettouh', phone: '+213551234567' },
  },
  {
    id: '0198b400-0001-7a01-8b01-0000000c0001',
    name: 'Soulaf Ayad',
    dateOfBirth: '2013-09-05',
    gender: 'female',
    bloodType: 'A+',
    nationalId: '201309054321098765',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Lina%20Haddad',
    allergies: ['Penicillin'],
    chronicDiseases: ['Asthma'],
    emergencyContact: { name: 'Nadia Haddad', phone: '+213770112233' },
  },
  {
    id: '0198b400-0002-7a02-8b02-0000000c0002',
    name: 'Sofia Bennani',
    dateOfBirth: '2011-11-23',
    gender: 'female',
    bloodType: 'B-',
    nationalId: '201111234567890123',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Sofia%20Bennani',
    allergies: [],
    chronicDiseases: ['Hypothyroidism'],
    emergencyContact: { name: 'Karim Bennani', phone: '+213661445566' },
  },
  {
    id: '0198b400-0003-7a03-8b03-0000000c0003',
    name: 'Yanis Meziane',
    dateOfBirth: '2014-04-20',
    gender: 'male',
    bloodType: 'O-',
    nationalId: '201404201122334455',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Yanis%20Meziane',
    allergies: ['Pollen'],
    chronicDiseases: ['Type 1 Diabetes'],
    emergencyContact: { name: 'Samir Meziane', phone: '+213770556677' },
  },
];
