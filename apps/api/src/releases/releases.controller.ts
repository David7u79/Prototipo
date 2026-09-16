import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponse } from '../common/dto/api-error.dto.js';
import { LatestReleaseResponse } from './dto/release.dto.js';
import { ReleasesService } from './releases.service.js';

@ApiTags('releases')
@Controller('releases')
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Get('latest/android')
  @ApiOkResponse({ type: LatestReleaseResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'NO_RELEASE_PUBLISHED' })
  latestAndroid(): Promise<LatestReleaseResponse> {
    return this.releases.latestAndroid();
  }

  @Get('android/:version/download')
  @ApiProduces('application/vnd.android.package-archive')
  @ApiOkResponse({ description: 'APK; cabecera X-Checksum-Sha256 con su SHA-256' })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'RELEASE_NOT_FOUND' })
  async downloadAndroid(
    @Param('version') version: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { release, stream } = await this.releases.openAndroidDownload(version);
    const safeName = release.fileName.replace(/[^A-Za-z0-9._-]/g, '_');
    response.setHeader('X-Checksum-Sha256', release.sha256);
    return new StreamableFile(stream, {
      type: 'application/vnd.android.package-archive',
      disposition: `attachment; filename="${safeName}"`,
      length: release.fileSize,
    });
  }
}
