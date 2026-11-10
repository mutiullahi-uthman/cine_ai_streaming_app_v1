// api/dto/create-film.dto.ts

import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFilmDto {
  @ApiProperty({ example: 'A Night in Lagos', minLength: 2 })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty({ example: 'A short synopsis of the film.', minLength: 5 })
  @IsString()
  @MinLength(5)
  synopsis!: string;

  @ApiPropertyOptional({ example: '2026-12-01T20:00:00.000Z', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  premiereAt?: string;
}