import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({ example: 'sarah.ahmed@vitale.dz' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
