// api/film.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateFilmDto } from './dto/create-film.dto';

import { CreateFilmService } from '../application/services/create-film.service';
import { FailFilmService } from '../application/services/fail-film.service';
import { GetFilmService } from '../application/services/get-film.service';
import { ListFilmsService } from '../application/services/list-films.service';
import { PublishFilmService } from '../application/services/publish-film.service';
import { CurrentUser, AuthenticatedUser } from '../../identity/api/decorators/current-user.decorator';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';
import { ResourceAuthorizationService } from '../../identity/application/services/resource-authorization.service';

@Controller('films')
@ApiTags('Films')
@ApiBearerAuth('access-token')
export class FilmController {
  constructor(
    private readonly createFilmService: CreateFilmService,
    private readonly getFilmService: GetFilmService,
    private readonly listFilmsService: ListFilmsService,
    private readonly publishFilmService: PublishFilmService,
    private readonly failFilmService: FailFilmService,
    private readonly authorization: ResourceAuthorizationService,
  ) {}

  @Post()
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a film' })
  @ApiCreatedResponse({ description: 'Film created.' })
  async create(
    @Body() dto: CreateFilmDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const film =
      await this.createFilmService.execute({
        creatorId: user.id,
        title: dto.title,
        synopsis: dto.synopsis,
        premiereAt: dto.premiereAt
          ? new Date(dto.premiereAt)
          : null,
      });

    return film;
  }

  @Get()
  @Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List publicly available films' })
  @ApiOkResponse({ description: 'List of ready or published films.' })
  async list() {
    return this.listFilmsService.execute();
  }

  @Get(':id')
  @Roles(UserRole.VIEWER, UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a film' })
  @ApiOkResponse({ description: 'Film details.' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertCanViewFilm(id, user);
    return this.getFilmService.execute(id);
  }

  @Post(':id/publish')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish a ready film' })
  @ApiOkResponse({ description: 'Published film.' })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnFilm(id, user);
    await this.publishFilmService.execute(id);

    return this.getFilmService.execute(id);
  }

  @Post(':id/fail')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark a film as failed (admin only)' })
  @ApiOkResponse({ description: 'Updated film.' })
  async fail(
    @Param('id') id: string,
  ) {
    await this.failFilmService.execute(id);

    return this.getFilmService.execute(id);
  }
}