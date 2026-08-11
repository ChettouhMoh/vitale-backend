import { Controller, Put, Body, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { UpdateLanguagesDto } from './update-languages.dto';
import { DoctorLanguages } from '@/doctor/domain';
import { IDoctorLanguagesRepository } from '@/doctor/ports';
import { CurrentUser } from '@/auth/decorators';

export class LanguagesResponse {
  @ApiProperty() doctorId!: string;
  @ApiProperty({ type: [String] }) languages!: string[];
  @ApiProperty() updatedAt!: string;

  static from(l: DoctorLanguages): LanguagesResponse {
    const r = new LanguagesResponse();
    r.doctorId = l.doctorId;
    r.languages = l.languages;
    r.updatedAt = l.updatedAt.toISOString();
    return r;
  }
}

@ApiTags('Doctors')
@Controller({ path: 'doctors', version: '1' })
export class UpdateLanguagesController {
  constructor(
    @Inject(IDoctorLanguagesRepository)
    private readonly languages: IDoctorLanguagesRepository,
  ) {}

  @Put('me/languages')
  @ApiOperation({ summary: 'Replace the whole languages list' })
  @ApiBody({ type: UpdateLanguagesDto })
  @ApiResponse({ status: 200, type: LanguagesResponse })
  async execute(
    @CurrentUser('id') doctorId: string,
    @Body() dto: UpdateLanguagesDto,
  ): Promise<LanguagesResponse> {
    const doc =
      (await this.languages.findByDoctorId(doctorId)) ??
      DoctorLanguages.createEmpty(doctorId);
    doc.replace(dto.languages);
    await this.languages.save(doc);
    return LanguagesResponse.from(doc);
  }
}
