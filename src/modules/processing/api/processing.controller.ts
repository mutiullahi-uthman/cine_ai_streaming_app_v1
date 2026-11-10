import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { GetProcessingJobService } from '../application/services/get-processing-job.service';
import { Roles } from '../../identity/api/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../identity/api/decorators/current-user.decorator';
import { UserRole } from '../../identity/domain/enums/user-role.enum';
import { ResourceAuthorizationService } from '../../identity/application/services/resource-authorization.service';

@Controller('processing/jobs')
@ApiTags('Processing')
@ApiBearerAuth('access-token')
export class ProcessingController {
  constructor(
    private readonly getProcessingJob: GetProcessingJobService,
    private readonly authorization: ResourceAuthorizationService,
  ) {}

  @Get(':id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a processing job' })
  @ApiOkResponse({ description: 'Processing job details.' })
  async get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authorization.assertOwnProcessingJob(id, user);
    return this.getProcessingJob.execute(id);
  }
}