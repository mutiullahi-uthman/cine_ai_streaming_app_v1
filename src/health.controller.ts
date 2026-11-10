import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PrismaService } from './infrastructure/database/prisma.service';
import { RedisService } from './infrastructure/cache/redis.service';
import { Public } from './modules/identity/api/decorators/public.decorator';

@Controller({ path: 'health', version: '1' })
@ApiTags('Health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Check API and dependency health', security: [] })
  @ApiOkResponse({ description: 'All checked dependencies are healthy.' })
  async check(): Promise<{ status: 'ok' }> {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.ping();
    return { status: 'ok' };
  }
}
