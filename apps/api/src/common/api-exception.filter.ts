import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/** Error de dominio con un código estable (ver API_ERROR_CODES en @garfit/types). */
export class ApiException extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
    readonly details?: string[],
  ) {
    super(message, status);
  }
}

/** Código por defecto para excepciones HTTP que no son ApiException (guards, pipes, 404). */
const DEFAULT_CODES: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
};

/** Normaliza toda respuesta de error al contrato ApiErrorBody. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ApiException) {
      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      // ValidationPipe entrega un arreglo de mensajes, uno por campo.
      const details = Array.isArray(message) ? message : undefined;
      response.status(status).json({
        statusCode: status,
        code: DEFAULT_CODES[status] ?? 'INTERNAL_ERROR',
        message: details ? 'Error de validación' : message,
        ...(details ? { details } : {}),
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    });
  }
}
