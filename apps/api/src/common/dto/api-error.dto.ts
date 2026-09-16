import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Forma común de los errores (ApiErrorBody en @garfit/types). */
export class ApiErrorResponse {
  @ApiProperty({ example: 404 }) statusCode!: number;
  @ApiProperty({ example: 'NO_RELEASE_PUBLISHED' }) code!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ type: [String] }) details?: string[];
}
