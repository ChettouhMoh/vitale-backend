import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateChronicDiseasesDto {
  @ApiProperty({ example: ['Asthma', 'Hypertension'], type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(150, { each: true })
  chronicDiseases!: string[];
}
