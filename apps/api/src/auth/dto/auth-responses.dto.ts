// Clases de respuesta sólo para documentar OpenAPI. Reflejan packages/types/src/index.ts.
import { ApiProperty } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ type: String, nullable: true }) name!: string | null;
  @ApiProperty({ type: String, nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['LOCAL', 'GOOGLE'], isArray: true }) providers!: ('LOCAL' | 'GOOGLE')[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AuthTokensResponse {
  @ApiProperty({ description: 'JWT HS256 de vida corta.' }) accessToken!: string;
  @ApiProperty({ description: 'Segundos hasta que expira el access token.' })
  accessTokenExpiresIn!: number;
  @ApiProperty({ description: 'Token opaco y rotativo.' }) refreshToken!: string;
  @ApiProperty({ format: 'date-time' }) refreshTokenExpiresAt!: string;
}

export class AuthResponse {
  @ApiProperty({ type: UserResponse }) user!: UserResponse;
  @ApiProperty({ type: AuthTokensResponse }) tokens!: AuthTokensResponse;
}

class GoogleProviderResponse {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: String, nullable: true }) webClientId!: string | null;
}

export class AuthProvidersResponse {
  @ApiProperty({ enum: [true] }) local!: true;
  @ApiProperty({ type: GoogleProviderResponse }) google!: GoogleProviderResponse;
}
