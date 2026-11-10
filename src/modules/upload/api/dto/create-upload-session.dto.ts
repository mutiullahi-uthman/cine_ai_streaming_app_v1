import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadSessionDto {
  @ApiProperty({ example: 'feature-film.mp4' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: '2147483648', pattern: '^[1-9]\\d*$' })
  @IsString()
  @Matches(/^[1-9]\d*$/)
  fileSize!: string;

  @ApiProperty({ example: 32, minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  totalParts!: number;
}