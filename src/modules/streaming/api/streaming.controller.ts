import {
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { GetPlaybackService } from '../application/services/get-playback.service';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';

@Controller('films')
@Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
@ApiTags('Playback')
@ApiBearerAuth('access-token')
export class StreamingController {
  constructor(private readonly getPlayback: GetPlaybackService) {}

  @Get(':filmId/play')
  @ApiOperation({
    summary: 'Start playback for a ready film',
    description: 'Returns the playback URL and sets scoped CloudFront signed cookies.',
  })
  @ApiOkResponse({ description: 'Playback access details.' })
  async play(
    @Param('filmId') filmId: string,
    @Res({ passthrough: true }) response: ServerResponse,
  ) {
    const access = await this.getPlayback.execute(filmId);
    response.setHeader('Set-Cookie', access.cookies);
    const { cookies: _cookies, ...result } = access;
    return result;
  }
}
