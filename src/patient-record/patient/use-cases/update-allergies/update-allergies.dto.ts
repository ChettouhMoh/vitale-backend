import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAllergiesDto {
  @ApiProperty({ example: ['Penicillin', 'Pollen'], type: [String] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  allergies!: string[];
}
