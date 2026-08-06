import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EducationEntryDto {
  @ApiProperty({ example: 'MD, Medicine' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  degree!: string;

  @ApiProperty({ example: 'Faculty of Medicine, Algiers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  institution!: string;

  @ApiProperty({ example: '2017' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'year must be a 4-digit year' })
  year!: string;
}

export class UpdateEducationDto {
  @ApiProperty({ type: [EducationEntryDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => EducationEntryDto)
  education!: EducationEntryDto[];
}
