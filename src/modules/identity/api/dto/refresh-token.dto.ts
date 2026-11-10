import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ minLength: 50, maxLength: 200 })
  @IsString()
  @MinLength(50)
  @MaxLength(200)
  refreshToken!: string;
}
