import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, AuthenticatedUser } from '../../identity/api/decorators/current-user.decorator';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';
import { ResourceAuthorizationService } from '../../identity/application/services/resource-authorization.service';
import { EndViewSessionService } from '../application/services/end-view-session.service';
import { GetFilmAnalyticsService } from '../application/services/get-film-analytics.service';
import { RecordViewHeartbeatService } from '../application/services/record-view-heartbeat.service';
import { StartViewSessionService } from '../application/services/start-view-session.service';
import { StartViewSessionDto } from './dto/start-view-session.dto';
import { ViewHeartbeatDto } from './dto/view-heartbeat.dto';

@Controller()
@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}))
export class AnalyticsController {
  constructor(
    private readonly startViewSession: StartViewSessionService,
    private readonly recordHeartbeat: RecordViewHeartbeatService,
    private readonly endViewSession: EndViewSessionService,
    private readonly getFilmAnalytics: GetFilmAnalyticsService,
    private readonly authorization: ResourceAuthorizationService,
  ) {}

  @Post('films/:filmId/analytics/sessions')
  @Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Start a viewer session' })
  @ApiCreatedResponse({ description: 'Viewer session created.' })
  startSession(
    @Param('filmId') filmId: string,
    @Body() dto: StartViewSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.startViewSession.execute({
      filmId,
      viewerId: user.id,
      device: dto.device?.trim() || null,
    });
  }

  @Patch('analytics/sessions/:sessionId/heartbeat')
  @Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a playback heartbeat' })
  @ApiOkResponse({ description: 'Viewer session updated.' })
  heartbeat(
    @Param('sessionId') sessionId: string,
    @Body() dto: ViewHeartbeatDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recordHeartbeat.execute({
      sessionId,
      viewerId: user.id,
      playing: dto.playing,
      rendition: dto.rendition,
    });
  }

  @Post('analytics/sessions/:sessionId/end')
  @Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'End a viewer session' })
  @ApiOkResponse({ description: 'Viewer session ended.' })
  endSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.endViewSession.execute(sessionId, user.id);
  }

  @Get('creator/films/:filmId/analytics')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get analytics for a creator film' })
  @ApiOkResponse({ description: 'Film viewing summary.' })
  async filmAnalytics(
    @Param('filmId') filmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnFilm(filmId, user);
    return {
      filmId,
      ...(await this.getFilmAnalytics.execute(filmId)),
    };
  }
}
