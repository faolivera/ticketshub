import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type { PageMetaDto } from './seo.api';

const readFile = promisify(fs.readFile);

const PLACEHOLDERS = {
  PAGE_TITLE: '__PAGE_TITLE__',
  PAGE_DESCRIPTION: '__PAGE_DESCRIPTION__',
  CANONICAL_URL: '__CANONICAL_URL__',
  OG_IMAGE: '__OG_IMAGE__',
  OG_TYPE: '__OG_TYPE__',
  /** HTML comment so it's invisible in dev when Vite serves raw index.html. Replaced in prod by buildGaScript(). */
  GA_SCRIPT: /<!--\s*__GA_SCRIPT__\s*-->/g,
} as const;

/** Google Analytics measurement ID. Script injected only when app.environment is prod. */
const GA_MEASUREMENT_ID = 'G-P6SQZDLQ7Q';

/** Escape for HTML attribute content (prevents breaking out of content="..." ) */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

@Injectable()
export class SeoService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Resolve the directory that contains index.html (frontend build or source).
   * In Docker prod: /app/backend/public. In dev: ../frontend or APP_CLIENT_BUILD_PATH.
   */
  private getClientBuildPath(): string {
    const configured = this.configService.get<string>('app.clientBuildPath');
    if (configured) {
      return path.isAbsolute(configured)
        ? configured
        : path.join(process.cwd(), configured);
    }
    const env = this.configService.get<string>('app.environment');
    if (env === 'dev' || env === 'test') {
      return path.join(process.cwd(), '..', 'frontend');
    }
    return path.join(process.cwd(), 'public');
  }

  /**
   * Read index.html from client build path, replace meta placeholders, return HTML.
   * Injects Google Analytics (gtag) script only when app.environment is 'prod'.
   */
  async getIndexHtml(meta: PageMetaDto): Promise<string> {
    const basePath = this.getClientBuildPath();
    const indexPath = path.join(basePath, 'index.html');
    const raw = await readFile(indexPath, 'utf-8');
    const title = escapeAttr(meta.title);
    const description = escapeAttr(meta.description);
    const canonicalUrl = escapeAttr(meta.canonicalUrl);
    const ogImage = escapeAttr(meta.ogImage);
    const ogType = escapeAttr(meta.ogType || 'website');
    const env = this.configService.get<string>('app.environment') ?? 'dev';
    const gaScript =
      env === 'prod'
        ? this.buildGaScript()
        : '';
    return raw
      .replace(new RegExp(PLACEHOLDERS.PAGE_TITLE, 'g'), title)
      .replace(new RegExp(PLACEHOLDERS.PAGE_DESCRIPTION, 'g'), description)
      .replace(new RegExp(PLACEHOLDERS.CANONICAL_URL, 'g'), canonicalUrl)
      .replace(new RegExp(PLACEHOLDERS.OG_IMAGE, 'g'), ogImage)
      .replace(new RegExp(PLACEHOLDERS.OG_TYPE, 'g'), ogType)
      .replace(PLACEHOLDERS.GA_SCRIPT, gaScript);
  }

  /**
   * Build the Google Analytics gtag script snippet for prod.
   * Inlined so index.html is self-contained and no extra round-trip is needed.
   */
  private buildGaScript(): string {
    return [
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>`,
      '<script>',
      'window.dataLayer = window.dataLayer || [];',
      'function gtag(){dataLayer.push(arguments);}',
      "gtag('js', new Date());",
      `gtag('config', '${GA_MEASUREMENT_ID}');`,
      '</script>',
    ].join('\n');
  }
}
