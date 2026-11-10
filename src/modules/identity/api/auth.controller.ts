import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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

import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthenticationService } from '../application/services/authentication.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('Authentication')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}))
export class AuthController {
  constructor(private readonly authentication: AuthenticationService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a viewer account', security: [] })
  @ApiCreatedResponse({ description: 'Account created and tokens issued.' })
  register(@Body() dto: RegisterDto) {
    return this.authentication.register(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in', security: [] })
  @ApiOkResponse({ description: 'Authentication tokens issued.' })
  login(@Body() dto: LoginDto) {
    return this.authentication.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token', security: [] })
  @ApiOkResponse({ description: 'New access and refresh tokens issued.' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authentication.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token', security: [] })
  @ApiNoContentResponse({ description: 'Refresh token revoked.' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authentication.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiOkResponse({ description: 'Authenticated user.' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
