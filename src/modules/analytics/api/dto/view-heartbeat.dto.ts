import {
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ViewHeartbeatDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  playing!: boolean;

  @ApiProperty({ enum: ['360p', '480p', '720p', '1080p'], example: '720p' })
  @IsIn(['360p', '480p', '720p', '1080p'])
  rendition!: string;
}
