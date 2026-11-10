import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, AuthenticatedUser } from '../../identity/api/decorators/current-user.decorator';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';
import { ResourceAuthorizationService } from '../../identity/application/services/resource-authorization.service';
import { GetFilmStatusService } from '../application/services/get-film-status.service';

@Controller('creator/films')
@Roles(UserRole.CREATOR, UserRole.ADMIN)
@ApiTags('Creator')
@ApiBearerAuth('access-token')
export class CreatorController {
  constructor(
    private readonly getFilmStatus: GetFilmStatusService,
    private readonly authorization: ResourceAuthorizationService,
  ) {}

  @Get(':id/status')
  @ApiOperation({ summary: 'Get film processing status and progress' })
  @ApiOkResponse({ description: 'Current film and processing progress.' })
  async getStatus(
    @Param('id') filmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnFilm(filmId, user);
    return this.getFilmStatus.execute(filmId);
  }
}
