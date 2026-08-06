import {
  IsArray,
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLanguagesDto {
  @ApiProperty({ type: [String], example: ['English', 'French', 'Arabic'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(60, { each: true })
  languages!: string[];
}
