import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAttachmentDto {
  // Ownership check — will come from the auth context once auth is wired.
  @ApiProperty({ example: 'doctor-123' })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}
