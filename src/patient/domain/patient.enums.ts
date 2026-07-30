/**
 * Patient enums — shared by the domain and the DTO (class-validator @IsEnum).
 * These are simple closed sets, so they live here as plain enums rather than VOs.
 */

export enum BloodTypeValue {
  APositive = 'A+',
  ANegative = 'A-',
  BPositive = 'B+',
  BNegative = 'B-',
  ABPositive = 'AB+',
  ABNegative = 'AB-',
  OPositive = 'O+',
  ONegative = 'O-',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
}
