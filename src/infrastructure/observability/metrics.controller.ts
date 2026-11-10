import { Controller, Get, Header } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { Roles } from '../../modules/identity/api/decorators/roles.decorator';
import { UserRole } from '../../modules/identity/domain/enums/user-role.enum';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape(): string {
    return this.metrics.renderPrometheus();
  }
}
