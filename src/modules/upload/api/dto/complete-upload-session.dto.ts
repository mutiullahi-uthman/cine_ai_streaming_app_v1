import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CompletedUploadPartDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  partNumber!: number;

  @ApiProperty({ example: '"etag-value"' })
  @IsString()
  etag!: string;
}

export class CompleteUploadSessionDto {
  @ApiProperty({ type: [CompletedUploadPartDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompletedUploadPartDto)
  completedParts!: CompletedUploadPartDto[];
}