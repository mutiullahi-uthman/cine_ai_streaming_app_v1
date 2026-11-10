import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, AuthenticatedUser } from '../../identity/api/decorators/current-user.decorator';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';
import { ResourceAuthorizationService } from '../../identity/application/services/resource-authorization.service';
import { GetPremiereService } from '../application/services/get-premiere.service';
import { SchedulePremiereService } from '../application/services/schedule-premiere.service';
import { UpdatePremiereStatusService } from '../application/services/update-premiere-status.service';
import { SchedulePremiereDto } from './dto/schedule-premiere.dto';

@Controller()
@ApiTags('Premieres')
@ApiBearerAuth('access-token')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}))
export class PremiereController {
  constructor(
    private readonly getPremiere: GetPremiereService,
    private readonly schedulePremiere: SchedulePremiereService,
    private readonly updatePremiereStatus: UpdatePremiereStatusService,
    private readonly authorization: ResourceAuthorizationService,
  ) {}

  @Post('films/:filmId/premiere')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule a film premiere' })
  @ApiCreatedResponse({ description: 'Premiere scheduled.' })
  async schedule(
    @Param('filmId') filmId: string,
    @Body() dto: SchedulePremiereDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnFilm(filmId, user);
    return this.schedulePremiere.execute(filmId, new Date(dto.startsAt));
  }

  @Get('films/:filmId/premiere')
  @Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a film premiere' })
  @ApiOkResponse({ description: 'Premiere details.' })
  async getByFilm(
    @Param('filmId') filmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertCanViewFilm(filmId, user);
    return this.getPremiere.executeByFilmId(filmId);
  }

  @Post('premieres/:id/cancel')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a scheduled premiere' })
  @ApiNoContentResponse({ description: 'Premiere cancelled.' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const premiere = await this.getPremiere.executeById(id);
    await this.authorization.assertOwnFilm(premiere.filmId, user);
    await this.updatePremiereStatus.cancel(id);
  }

  @Post('premieres/:id/end')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a live premiere' })
  @ApiNoContentResponse({ description: 'Premiere ended.' })
  async end(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const premiere = await this.getPremiere.executeById(id);
    await this.authorization.assertOwnFilm(premiere.filmId, user);
    await this.updatePremiereStatus.end(id);
  }
}
