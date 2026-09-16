import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../common/constants.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'atleta@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiProperty({ maxLength: NAME_MAX_LENGTH, example: 'Ana López' })
  @Transform(trim)
  @IsString()
  @Length(1, NAME_MAX_LENGTH)
  name!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'atleta@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  // Sin longitud mínima: el login no debe revelar la política de contraseñas.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID token (JWT) emitido por Google Identity Services.' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token opaco emitido por GarFit.' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
