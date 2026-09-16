import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import { ApiException } from '../common/api-exception.filter.js';
import type { Env } from '../common/config/env.js';
import { SEMVER } from '../common/constants.js';
import type { AppRelease } from '../generated/prisma/client.js';
import { ReleasePlatform } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LatestReleaseResponse } from './dto/release.dto.js';
import { ReleaseStorage } from './storage/release-storage.js';

export interface ReleaseDownload {
  release: AppRelease;
  stream: Readable;
}

@Injectable()
export class ReleasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ReleaseStorage,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Última versión Android publicada (mayor versionCode). Los borradores se ignoran. */
  async latestAndroid(): Promise<LatestReleaseResponse> {
    const release = await this.prisma.appRelease.findFirst({
      where: { platform: ReleasePlatform.ANDROID, published: true },
      orderBy: { versionCode: 'desc' },
    });
    if (!release) {
      throw new ApiException(
        404,
        'NO_RELEASE_PUBLISHED',
        'No hay una versión publicada actualmente',
      );
    }

    const apiUrl = this.config.get('PUBLIC_API_URL', { infer: true });
    return {
      platform: 'android',
      version: release.version,
      versionCode: release.versionCode,
      releasedAt: (release.publishedAt ?? release.createdAt).toISOString(),
      size: release.fileSize,
      downloadUrl: `${apiUrl}/releases/android/${encodeURIComponent(release.version)}/download`,
      sha256: release.sha256,
      changelog: release.changelog,
    };
  }

  async openAndroidDownload(version: string): Promise<ReleaseDownload> {
    if (!SEMVER.test(version)) {
      throw new ApiException(400, 'VALIDATION_FAILED', 'La versión no es SemVer válida');
    }
    const release = await this.prisma.appRelease.findFirst({
      where: { platform: ReleasePlatform.ANDROID, version, published: true },
    });
    // La ruta del fichero sale de la BD, nunca de la petición.
    const size = release ? await this.storage.size(release.filePath) : null;
    if (!release || size === null) {
      throw new ApiException(404, 'RELEASE_NOT_FOUND', 'Esa versión no está disponible');
    }
    return { release, stream: await this.storage.openRead(release.filePath) };
  }
}
