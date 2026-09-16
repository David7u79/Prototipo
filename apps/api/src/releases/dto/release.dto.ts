import { ApiProperty } from '@nestjs/swagger';

/** LatestReleaseResponse en @garfit/types. */
export class LatestReleaseResponse {
  @ApiProperty({ enum: ['android'] }) platform!: 'android';
  @ApiProperty({ example: '1.0.0' }) version!: string;
  @ApiProperty({ example: 1 }) versionCode!: number;
  @ApiProperty({ format: 'date-time' }) releasedAt!: string;
  @ApiProperty({ description: 'Tamaño del APK en bytes.' }) size!: number;
  @ApiProperty() downloadUrl!: string;
  @ApiProperty({ description: 'SHA-256 del APK en hexadecimal.' }) sha256!: string;
  @ApiProperty({ type: [String] }) changelog!: string[];
}
