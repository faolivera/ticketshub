import {
  Controller,
  Get,
  Param,
  Res,
  Header,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import { BffService } from '../bff/bff.service';
import { SsrService } from './ssr.service';
import {
  type PageMetaDto,
  SSR_STATIC_META,
} from './ssr.api';

@Controller()
export class SsrController {
  private readonly defaultOgImage: string;

  constructor(
    private readonly ssrService: SsrService,
    private readonly bffService: BffService,
    private readonly configService: ConfigService,
  ) {
    const baseUrl =
      this.configService.get<string>('app.publicUrl') || 'http://localhost:5173';
    this.defaultOgImage = `${baseUrl.replace(/\/$/, '')}/assets/og-default.png`;
  }

  private baseUrl(): string {
    return (
      this.configService.get<string>('app.publicUrl') || 'http://localhost:5173'
    );
  }

  private buildMeta(
    title: string,
    description: string,
    pathname: string,
    ogImage?: string,
    ogType = 'website',
  ): PageMetaDto {
    const base = this.baseUrl().replace(/\/$/, '');
    const canonical = `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    return {
      title,
      description,
      canonicalUrl: canonical,
      ogImage: ogImage || this.defaultOgImage,
      ogType,
    };
  }

  private toAbsoluteImage(baseUrl: string, imagePath: string | undefined): string | undefined {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    const base = baseUrl.replace(/\/$/, '');
    return `${base}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async index(@Res() res: Response): Promise<void> {
    const meta = this.buildMeta(
      SSR_STATIC_META.landing.title,
      SSR_STATIC_META.landing.description,
      '/',
    );
    const html = await this.ssrService.getIndexHtml(meta);
    res.send(html);
  }

  @Get('login')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async login(@Res() res: Response): Promise<void> {
    const meta = this.buildMeta(
      SSR_STATIC_META.login.title,
      SSR_STATIC_META.login.description,
      '/login',
    );
    const html = await this.ssrService.getIndexHtml(meta);
    res.send(html);
  }

  @Get('register')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async register(@Res() res: Response): Promise<void> {
    const meta = this.buildMeta(
      SSR_STATIC_META.register.title,
      SSR_STATIC_META.register.description,
      '/register',
    );
    const html = await this.ssrService.getIndexHtml(meta);
    res.send(html);
  }

  @Get('how-it-works')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async howItWorks(@Res() res: Response): Promise<void> {
    const meta = this.buildMeta(
      SSR_STATIC_META.howItWorks.title,
      SSR_STATIC_META.howItWorks.description,
      '/how-it-works',
    );
    const html = await this.ssrService.getIndexHtml(meta);
    res.send(html);
  }

  @Get('contact')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async contact(@Res() res: Response): Promise<void> {
    const meta = this.buildMeta(
      SSR_STATIC_META.contact.title,
      SSR_STATIC_META.contact.description,
      '/contact',
    );
    const html = await this.ssrService.getIndexHtml(meta);
    res.send(html);
  }

  @Get('event/:eventSlug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async event(
    @Context() ctx: Ctx,
    @Param('eventSlug') eventSlug: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { event } = await this.bffService.getEventPageData(ctx, eventSlug);
      const title = SSR_STATIC_META.eventTickets.title.replace(
        '{{eventName}}',
        event.name,
      );
      const description = SSR_STATIC_META.eventTickets.description.replace(
        '{{eventName}}',
        event.name,
      );
      const imagePath =
        event.bannerUrls?.rectangle || event.bannerUrls?.square;
      const ogImage = this.toAbsoluteImage(this.baseUrl(), imagePath);
      const meta = this.buildMeta(
        title,
        description,
        `/event/${eventSlug}`,
        ogImage,
      );
      const html = await this.ssrService.getIndexHtml(meta);
      res.send(html);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const meta = this.buildMeta(
        SSR_STATIC_META.default.title,
        SSR_STATIC_META.default.description,
        `/event/${eventSlug}`,
      );
      const html = await this.ssrService.getIndexHtml(meta);
      res.send(html);
    }
  }

  @Get('seller/:sellerId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async seller(
    @Context() ctx: Ctx,
    @Param('sellerId') sellerId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const profile = await this.bffService.getSellerProfile(ctx, sellerId);
      const title = SSR_STATIC_META.sellerProfile.title.replace(
        '{{sellerName}}',
        profile.publicName,
      );
      const description = SSR_STATIC_META.sellerProfile.description.replace(
        '{{sellerName}}',
        profile.publicName,
      );
      const meta = this.buildMeta(
        title,
        description,
        `/seller/${sellerId}`,
      );
      const html = await this.ssrService.getIndexHtml(meta);
      res.send(html);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const meta = this.buildMeta(
        SSR_STATIC_META.default.title,
        SSR_STATIC_META.default.description,
        `/seller/${sellerId}`,
      );
      const html = await this.ssrService.getIndexHtml(meta);
      res.send(html);
    }
  }

  @Get('buy/:eventSlug/:listingId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async buy(
    @Context() ctx: Ctx,
    @Param('eventSlug') _eventSlug: string,
    @Param('listingId') listingId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.bffService.getBuyPageData(ctx, listingId);
      const { listing } = data;
      const title = SSR_STATIC_META.buyTicket.title.replace(
        '{{eventName}}',
        listing.eventName,
      );
      const description = SSR_STATIC_META.buyTicket.description.replace(
        '{{eventName}}',
        listing.eventName,
      );
      const imagePath =
        listing.bannerUrls?.rectangle || listing.bannerUrls?.square;
      const ogImage = this.toAbsoluteImage(this.baseUrl(), imagePath);
      const meta = this.buildMeta(
        title,
        description,
        `/buy/${_eventSlug}/${listingId}`,
        ogImage,
      );
      const html = await this.ssrService.getIndexHtml(meta);
      res.send(html);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const meta = this.buildMeta(
        SSR_STATIC_META.default.title,
        SSR_STATIC_META.default.description,
        `/buy/${_eventSlug}/${listingId}`,
      );
      const html = await this.ssrService.getIndexHtml(meta);
      res.send(html);
    }
  }

  @Get('*')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async catchAll(@Res() res: Response): Promise<void> {
    const req = res.req as { path?: string; url?: string };
    const pathname = req.path ?? (req.url?.split('?')[0] ?? '/');
    const meta = this.buildMeta(
      SSR_STATIC_META.default.title,
      SSR_STATIC_META.default.description,
      pathname,
    );
    const html = await this.ssrService.getIndexHtml(meta);
    res.send(html);
  }
}
