import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Ctx } from '../../common/types/context';
import type { IImagesRepository } from '../images/images.repository.interface';
import { IMAGES_REPOSITORY } from '../images/images.repository.interface';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  ITicketsRepository,
  TICKETS_REPOSITORY,
} from '../tickets/tickets.repository.interface';
import {
  IdentityVerificationStatus,
  Language,
  Role,
  UserStatus,
} from '../users/users.domain';
import { EventCategory, EventSectionStatus } from '../events/events.domain';
import {
  TicketType,
  DeliveryMethod,
  SeatingType,
} from '../tickets/tickets.domain';
import type { SeedDemoResponse } from './support.api';
import type { User } from '../users/users.domain';
import type { CreateEventRequest } from '../events/events.api';
import type { CreateListingRequest } from '../tickets/tickets.api';

@Injectable()
export class SupportSeedService {
  constructor(
    @Inject(IMAGES_REPOSITORY)
    private readonly imagesRepository: IImagesRepository,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(TICKETS_REPOSITORY)
    private readonly ticketsRepository: ITicketsRepository,
    private readonly configService: ConfigService,
  ) {}

  async seedDemoData(ctx: Ctx): Promise<SeedDemoResponse> {
    const isProduction = this.configService.get<boolean>('app.isProduction');
    if (isProduction) {
      throw new ForbiddenException(
        'This endpoint is not available in production',
      );
    }

    const credentials = {
      admin: { email: 'admin@ticketshub.local', password: 'admin123' },
      seller: { email: 'seller@ticketshub.local', password: 'seller123' },
      buyer: { email: 'buyer@ticketshub.local', password: 'buyer123' },
    } as const;

    // Images (deterministic IDs so seeding is idempotent)
    const imageIds = {
      admin: 'img_seed_admin',
      seller: 'img_seed_seller',
      buyer: 'img_seed_buyer',
      badBunny: 'img_seed_bad_bunny',
    } as const;

    await this.imagesRepository.set(ctx, {
      id: imageIds.admin,
      src: '/images/default/default.png',
    });
    await this.imagesRepository.set(ctx, {
      id: imageIds.seller,
      src: '/images/default/default.png',
    });
    await this.imagesRepository.set(ctx, {
      id: imageIds.buyer,
      src: '/images/default/default.png',
    });
    await this.imagesRepository.set(ctx, {
      id: imageIds.badBunny,
      src: 'https://cdn.getcrowder.com/images/eefb35a2-3993-4a81-9dfc-16c29cfe6551-banner-mobile--quentro-640-x-640--14-feb.png',
    });

    const admin = await this.upsertUser(ctx, {
      email: credentials.admin.email,
      password: credentials.admin.password,
      firstName: 'Admin',
      lastName: 'User',
      publicName: 'TicketsHub Admin',
      role: Role.Admin,
      status: UserStatus.Enabled,
      imageId: imageIds.admin,
      language: Language.ES,
      emailVerified: true,
      phoneVerified: true,
      buyerDisputed: false,
    });

    const seller = await this.upsertUser(ctx, {
      email: credentials.seller.email,
      password: credentials.seller.password,
      firstName: 'Verified',
      lastName: 'Seller',
      publicName: 'Verified Seller',
      role: Role.User,
      status: UserStatus.Enabled,
      imageId: imageIds.seller,
      language: Language.ES,
      acceptedSellerTermsAt: new Date(),
      emailVerified: true,
      phoneVerified: true,
      identityVerification: {
        status: IdentityVerificationStatus.Approved,
        legalFirstName: 'Verified',
        legalLastName: 'Seller',
        dateOfBirth: '1990-05-15',
        governmentIdNumber: '30123456',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: admin.id,
      },
      bankAccount: {
        holderName: 'Verified Seller',
        cbuOrCvu: '0000000000000000000000',
        verified: true,
        verifiedAt: new Date(),
      },
      buyerDisputed: false,
    });

    const buyer = await this.upsertUser(ctx, {
      email: credentials.buyer.email,
      password: credentials.buyer.password,
      firstName: 'Buyer',
      lastName: 'User',
      publicName: 'Buyer',
      role: Role.User,
      status: UserStatus.Enabled,
      imageId: imageIds.buyer,
      language: Language.ES,
      emailVerified: true,
      phoneVerified: true,
      buyerDisputed: false,
    });

    // Event: BAD BUNNY
    const existingEvents = await this.eventsService.listEvents(
      ctx,
      { search: 'bad bunny', limit: 50, offset: 0 },
      true,
    );
    const existingBadBunny = existingEvents.find(
      (e) => e.name.toLowerCase() === 'bad bunny',
    );

    const event =
      existingBadBunny ||
      (await this.eventsService.createEvent(
        ctx,
        admin.id,
        Role.Admin,
        this.getBadBunnyEventRequest(imageIds.badBunny),
      ));

    const eventWithDates = await this.eventsService.getEventById(ctx, event.id);

    const targetDates = [
      new Date('2026-02-13T00:00:00.000Z'),
      new Date('2026-02-14T00:00:00.000Z'),
      new Date('2026-02-15T00:00:00.000Z'),
    ];

    const existingDateKeys = new Set<string>(
      (eventWithDates.dates || []).map((d) => this.toDateKey(d.date)),
    );

    const createdDateIds: string[] = [];
    for (const date of targetDates) {
      const key = this.toDateKey(date);
      if (existingDateKeys.has(key)) continue;
      const created = await this.eventsService.addEventDate(
        ctx,
        event.id,
        admin.id,
        Role.Admin,
        {
          date: date.toISOString(),
        },
      );
      createdDateIds.push(created.id);
      existingDateKeys.add(key);
    }

    const refreshedEvent = await this.eventsService.getEventById(ctx, event.id);
    const primaryDateId = refreshedEvent.dates?.[0]?.id;
    if (!primaryDateId) {
      throw new Error('Seed failed: event date was not created');
    }

    // Create event sections if they don't exist
    const sectionSpecs: { name: string; seatingType: SeatingType }[] = [
      { name: 'Platea', seatingType: SeatingType.Numbered },
      { name: 'Campo', seatingType: SeatingType.Unnumbered },
      { name: 'Platea Alta', seatingType: SeatingType.Unnumbered },
    ];
    const existingSections = refreshedEvent.sections || [];
    const existingSectionNames = new Set(
      existingSections.map((s) => s.name.toLowerCase()),
    );

    const sectionMap: Record<string, string> = {};
    for (const section of existingSections) {
      sectionMap[section.name] = section.id;
    }

    for (const spec of sectionSpecs) {
      if (existingSectionNames.has(spec.name.toLowerCase())) continue;
      const createdSection = await this.eventsService.addEventSection(
        ctx,
        event.id,
        admin.id,
        Role.Admin,
        { name: spec.name, seatingType: spec.seatingType },
      );
      sectionMap[spec.name] = createdSection.id;
    }

    // Tickets: 3 listings from seller (identified by eventSectionId + price)
    const sellerListings = await this.ticketsRepository.getBySellerId(
      ctx,
      seller.id,
    );
    const existingForEvent = sellerListings.filter((l) => l.eventId === event.id);
    const existingSignatures = new Set(
      existingForEvent.map(
        (l) => `${l.eventSectionId}-${l.pricePerTicket.amount}`,
      ),
    );

    const desiredSeedVariants: Array<1 | 2 | 3> = [1, 2, 3];
    const createdListingIds: string[] = [];

    for (const variant of desiredSeedVariants) {
      const req = this.getSeedListingRequest(
        event.id,
        primaryDateId,
        variant,
        sectionMap,
      );
      const signature = `${req.eventSectionId}-${req.pricePerTicket.amount}`;
      if (existingSignatures.has(signature)) continue;
      const listing = await this.ticketsService.createListing(
        ctx,
        seller.id,
        req,
      );
      createdListingIds.push(listing.id);
      existingSignatures.add(signature);
    }

    const finalListings = await this.ticketsRepository.getBySellerId(
      ctx,
      seller.id,
    );
    const finalSeedListings = finalListings.filter(
      (l) => l.eventId === event.id,
    );

    return {
      credentials,
      ids: {
        adminUserId: admin.id,
        sellerUserId: seller.id,
        buyerUserId: buyer.id,
        eventId: event.id,
        eventDateIds: Array.from(
          new Set<string>((refreshedEvent.dates || []).map((d) => d.id)),
        ),
        ticketListingIds: finalSeedListings.map((l) => l.id),
      },
      created: {
        eventDates: createdDateIds,
        ticketListings: createdListingIds,
      },
    };
  }

  private async upsertUser(
    ctx: Ctx,
    data: Omit<User, 'id' | 'country' | 'currency' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const existing = await this.usersService.findByEmail(ctx, data.email);
    if (existing) {
      return existing;
    }

    return await this.usersService.add(ctx, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private getBadBunnyEventRequest(imageId: string): CreateEventRequest {
    return {
      name: 'BAD BUNNY',
      category: EventCategory.Concert,
      venue: 'Estadio River Plate',
      location: {
        line1: 'Av. Figueroa Alcorta 7597',
        city: 'Buenos Aires',
        state: 'CABA',
        postalCode: 'C1428',
        countryCode: 'AR',
      },
      imageIds: [imageId],
    };
  }

  private getSeedListingRequest(
    eventId: string,
    eventDateId: string,
    variant: 1 | 2 | 3,
    sectionMap: Record<string, string>,
  ): CreateListingRequest {
    if (variant === 1) {
      return {
        eventId,
        eventDateId,
        type: TicketType.Digital,
        sellTogether: false,
        pricePerTicket: { amount: 15000, currency: 'EUR' },
        eventSectionId: sectionMap['Platea'],
        ticketUnits: [
          { seat: { row: '10', seatNumber: '12' } },
          { seat: { row: '10', seatNumber: '13' } },
        ],
      };
    }

    if (variant === 2) {
      return {
        eventId,
        eventDateId,
        type: TicketType.Physical,
        quantity: 1,
        sellTogether: true,
        pricePerTicket: { amount: 17500, currency: 'EUR' },
        deliveryMethod: DeliveryMethod.Pickup,
        pickupAddress: {
          line1: 'Alexanderplatz 1',
          city: 'Berlin',
          postalCode: '10178',
          countryCode: 'DE',
        },
        eventSectionId: sectionMap['Campo'],
      };
    }

    return {
      eventId,
      eventDateId,
      type: TicketType.Digital,
      quantity: 1,
      sellTogether: true,
      pricePerTicket: { amount: 12000, currency: 'EUR' },
      eventSectionId: sectionMap['Platea Alta'],
    };
  }

  private toDateKey(value: unknown): string {
    const d = value instanceof Date ? value : new Date(String(value));
    const iso = Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
    return iso.slice(0, 10);
  }
}
