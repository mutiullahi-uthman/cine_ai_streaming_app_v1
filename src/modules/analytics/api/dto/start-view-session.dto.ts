import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartViewSessionDto {
  @ApiPropertyOptional({ enum: ['mobile', 'tablet', 'desktop', 'tv', 'other'] })
  @IsOptional()
  @IsIn(['mobile', 'tablet', 'desktop', 'tv', 'other'])
  device?: string;
}
