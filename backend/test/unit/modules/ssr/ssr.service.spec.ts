import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SsrService } from '../../../../src/modules/ssr/ssr.service';

const PLACEHOLDER_GA = '<!-- __GA_SCRIPT__ -->';
const mockIndexHtml = `
<!DOCTYPE html>
<html><head>
<title>__PAGE_TITLE__</title>
<meta name="description" content="__PAGE_DESCRIPTION__" />
<link rel="canonical" href="__CANONICAL_URL__" />
<meta property="og:image" content="__OG_IMAGE__" />
<meta property="og:type" content="__OG_TYPE__" />
${PLACEHOLDER_GA}
</head><body><div id="root"></div></body></html>
`;

let mockReadFileResponse: string;
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFile: jest.fn(
      (
        _path: string,
        _encoding: string,
        callback: (err: Error | null, data?: string) => void,
      ) => {
        callback(null, mockReadFileResponse);
      },
    ),
  };
});

describe('SsrService', () => {
  let service: SsrService;
  let configService: jest.Mocked<ConfigService>;

  const meta = {
    title: 'Test Title',
    description: 'Test description',
    canonicalUrl: 'https://example.com/',
    ogImage: 'https://example.com/og.png',
    ogType: 'website',
  };

  beforeEach(async () => {
    mockReadFileResponse = mockIndexHtml;
    const mockConfigGet = jest.fn((key: string) => {
      if (key === 'app.clientBuildPath') return undefined;
      if (key === 'app.environment') return 'dev';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsrService,
        {
          provide: ConfigService,
          useValue: { get: mockConfigGet },
        },
      ],
    }).compile();

    service = module.get<SsrService>(SsrService);
    configService = module.get(ConfigService);
  });

  describe('getIndexHtml', () => {
    it('should replace meta placeholders with escaped values', async () => {
      const html = await service.getIndexHtml(meta);
      expect(html).toContain('Test Title');
      expect(html).toContain('Test description');
      expect(html).toContain('https://example.com/');
      expect(html).toContain('https://example.com/og.png');
      expect(html).not.toContain('__PAGE_TITLE__');
      expect(html).not.toContain(PLACEHOLDER_GA);
    });

    it('should inject GA script when app.environment is prod', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'app.clientBuildPath') return undefined;
        if (key === 'app.environment') return 'prod';
        return undefined;
      });

      const html = await service.getIndexHtml(meta);

      expect(html).toContain('googletagmanager.com/gtag/js');
      expect(html).toContain('G-P6SQZDLQ7Q');
      expect(html).toContain('window.dataLayer');
      expect(html).toContain("gtag('config'");
      expect(html).not.toContain(PLACEHOLDER_GA);
    });

    it('should not inject GA script when app.environment is not prod', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'app.clientBuildPath') return undefined;
        if (key === 'app.environment') return 'staging';
        return undefined;
      });

      const html = await service.getIndexHtml(meta);

      expect(html).not.toContain('googletagmanager.com');
      expect(html).not.toContain('dataLayer');
      expect(html).not.toContain(PLACEHOLDER_GA);
    });

    it('should escape meta values for HTML attributes', async () => {
      const metaWithSpecialChars = {
        ...meta,
        title: 'Title with "quotes" and <script>',
        description: 'Desc & ampersand',
      };

      const html = await service.getIndexHtml(metaWithSpecialChars);

      expect(html).toContain('&quot;');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<script>');
    });
  });
});
