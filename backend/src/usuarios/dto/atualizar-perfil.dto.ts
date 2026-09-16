import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PreferenciasDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  orcamentoReferencia?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  interessesPadrao?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  estiloViagemPadrao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  climaPreferido?: string;
}

export class AtualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenciasDto)
  preferencias?: PreferenciasDto;
}
