import {
  Body,
  Controller,
  Delete,
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

import { AbortUploadSessionService } from '../application/services/abort-upload-session.service';
import { CompleteUploadSessionService } from '../application/services/complete-upload-session.service';
import { CreateUploadSessionService } from '../application/services/create-upload-session.service';
import { GetUploadSessionService } from '../application/services/get-upload-session.service';
import { ListFilmUploadsService } from '../application/services/list-film-uploads.service';
import { CompleteUploadSessionCommand } from '../application/commands/complete-upload-session.command';
import { CreateUploadSessionCommand } from '../application/commands/create-upload-session.command';
import { CompleteUploadSessionDto } from './dto/complete-upload-session.dto';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto';
import { CurrentUser, AuthenticatedUser } from '../../identity/api/decorators/current-user.decorator';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';
import { ResourceAuthorizationService } from '../../identity/application/services/resource-authorization.service';

@Controller()
@Roles(UserRole.CREATOR, UserRole.ADMIN)
@ApiTags('Uploads')
@ApiBearerAuth('access-token')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
}))
export class UploadController {
  constructor(
    private readonly createUploadSession: CreateUploadSessionService,
    private readonly completeUploadSession: CompleteUploadSessionService,
    private readonly abortUploadSession: AbortUploadSessionService,
    private readonly getUploadSession: GetUploadSessionService,
    private readonly listFilmUploads: ListFilmUploadsService,
    private readonly authorization: ResourceAuthorizationService,
  ) {}

  @Post('films/:filmId/uploads')
  @ApiOperation({ summary: 'Create a multipart upload session' })
  @ApiCreatedResponse({ description: 'Upload session created.' })
  async create(
    @Param('filmId') filmId: string,
    @Body() dto: CreateUploadSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnFilm(filmId, user);
    return this.createUploadSession.execute(
      new CreateUploadSessionCommand(
        filmId,
        dto.fileName,
        BigInt(dto.fileSize),
        dto.totalParts,
      ),
    );
  }

  @Get('films/:filmId/uploads')
  @ApiOperation({ summary: 'List upload sessions for a film' })
  @ApiOkResponse({ description: 'Upload sessions for the film.' })
  async listForFilm(
    @Param('filmId') filmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnFilm(filmId, user);
    return this.listFilmUploads.execute(filmId);
  }

  @Post('uploads/:id/complete')
  @ApiOperation({ summary: 'Complete a multipart upload' })
  @ApiOkResponse({ description: 'Upload completed.' })
  async complete(
    @Param('id') uploadId: string,
    @Body() dto: CompleteUploadSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnUpload(uploadId, user);
    return this.completeUploadSession.execute(
      new CompleteUploadSessionCommand(
        uploadId,
        dto.completedParts,
      ),
    );
  }

  @Delete('uploads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Abort an upload session' })
  @ApiNoContentResponse({ description: 'Upload aborted.' })
  async abort(
    @Param('id') uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.authorization.assertOwnUpload(uploadId, user);
    await this.abortUploadSession.execute(uploadId);
  }

  @Get('uploads/:id')
  @ApiOperation({ summary: 'Get an upload session' })
  @ApiOkResponse({ description: 'Upload session details.' })
  async get(
    @Param('id') uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnUpload(uploadId, user);
    return this.getUploadSession.execute(uploadId);
  }
}