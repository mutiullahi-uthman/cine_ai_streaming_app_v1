import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SchedulePremiereDto {
  @ApiProperty({ example: '2026-12-01T20:00:00.000Z', format: 'date-time' })
  @IsDateString()
  startsAt!: string;
}
