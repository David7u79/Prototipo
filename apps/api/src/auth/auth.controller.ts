import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Env } from '../common/config/env.js';
import { ApiErrorResponse } from '../common/dto/api-error.dto.js';
import { AuthService } from './auth.service.js';
import { AuthProvidersResponse, AuthResponse, UserResponse } from './dto/auth-responses.dto.js';
import { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto.js';
import { CurrentUser, JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './jwt.strategy.js';

/** Límite estricto contra fuerza bruta en endpoints que aceptan credenciales. */
const CREDENTIALS_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('providers')
  @ApiOkResponse({ type: AuthProvidersResponse })
  providers(): AuthProvidersResponse {
    const webClientId = this.config.get('GOOGLE_WEB_CLIENT_ID', { infer: true });
    return { local: true, google: { enabled: webClientId !== null, webClientId } };
  }

  @Post('register')
  @Throttle(CREDENTIALS_THROTTLE)
  @ApiCreatedResponse({ type: AuthResponse })
  @ApiConflictResponse({ type: ApiErrorResponse, description: 'EMAIL_ALREADY_REGISTERED' })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(CREDENTIALS_THROTTLE)
  @ApiOkResponse({ type: AuthResponse })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'INVALID_CREDENTIALS' })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('google')
  @HttpCode(200)
  @Throttle(CREDENTIALS_THROTTLE)
  @ApiOkResponse({ type: AuthResponse })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'INVALID_GOOGLE_TOKEN' })
  @ApiServiceUnavailableResponse({
    type: ApiErrorResponse,
    description: 'GOOGLE_AUTH_NOT_CONFIGURED',
  })
  google(@Body() dto: GoogleLoginDto): Promise<AuthResponse> {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(CREDENTIALS_THROTTLE)
  @ApiOkResponse({ type: AuthResponse, description: 'Tokens rotados' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'INVALID_REFRESH_TOKEN' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Sesión revocada (idempotente)' })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponse })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.auth.me(user.id);
  }
}
