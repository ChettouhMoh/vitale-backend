import {
  IsArray,
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExpertiseDto {
  @ApiProperty({
    type: [String],
    example: ['Interventional Cardiology', 'Heart Failure'],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  expertise!: string[];
}
