import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import type { Ctx } from '../../common/types/context';
import { ImagesRepository } from '../images/images.repository';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketsRepository } from '../tickets/tickets.repository';
import { IdentityVerificationStatus, Role, UserLevel } from '../users/users.domain';
import { EventCategory } from '../events/events.domain';
import { TicketType, DeliveryMethod } from '../tickets/tickets.domain';
import type { SeedDemoResponse } from './support.api';
import type { User } from '../users/users.domain';
import type { CreateEventRequest } from '../events/events.api';
import type { CreateListingRequest } from '../tickets/tickets.api';

@Injectable()
export class SupportSeedService {
  constructor(
    @Inject(ImagesRepository)
    private readonly imagesRepository: ImagesRepository,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(TicketsRepository)
    private readonly ticketsRepository: TicketsRepository,
  ) {}

  async seedDemoData(ctx: Ctx): Promise<SeedDemoResponse> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is not available in production');
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
      level: UserLevel.Basic,
      profiles: ['Customer'],
      lastUsedProfile: 'Customer',
      imageId: imageIds.admin,
      emailVerified: true,
      phoneVerified: true,
    });

    const seller = await this.upsertUser(ctx, {
      email: credentials.seller.email,
      password: credentials.seller.password,
      firstName: 'Verified',
      lastName: 'Seller',
      publicName: 'Verified Seller',
      role: Role.User,
      level: UserLevel.VerifiedSeller,
      profiles: ['Provider', 'Customer'],
      lastUsedProfile: 'Provider',
      imageId: imageIds.seller,
      emailVerified: true,
      phoneVerified: true,
      identityVerification: {
        status: IdentityVerificationStatus.Approved,
        documentUrls: ['https://example.com/document.png'],
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: admin.id,
      },
      bankAccount: {
        holderName: 'Verified Seller',
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
        verified: true,
        verifiedAt: new Date(),
      },
    });

    const buyer = await this.upsertUser(ctx, {
      email: credentials.buyer.email,
      password: credentials.buyer.password,
      firstName: 'Buyer',
      lastName: 'User',
      publicName: 'Buyer',
      role: Role.User,
      level: UserLevel.Buyer,
      profiles: ['Customer'],
      lastUsedProfile: 'Customer',
      imageId: imageIds.buyer,
      emailVerified: true,
      phoneVerified: false,
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
        UserLevel.Basic,
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
      const created = await this.eventsService.addEventDate(ctx, event.id, admin.id, Role.Admin, {
        date,
      });
      createdDateIds.push(created.id);
      existingDateKeys.add(key);
    }

    const refreshedEvent = await this.eventsService.getEventById(ctx, event.id);
    const primaryDateId = refreshedEvent.dates?.[0]?.id;
    if (!primaryDateId) {
      throw new Error('Seed failed: event date was not created');
    }

    // Tickets: 3 listings from seller
    const sellerListings = await this.ticketsRepository.getBySellerId(ctx, seller.id);
    const existingSeedListings = sellerListings.filter(
      (l) => l.eventId === event.id && (l.description || '').startsWith('Seed listing'),
    );

    const desiredDescriptions = [
      'Seed listing 1 - Bad Bunny',
      'Seed listing 2 - Bad Bunny',
      'Seed listing 3 - Bad Bunny',
    ];

    const existingDescriptions = new Set(existingSeedListings.map((l) => l.description || ''));
    const createdListingIds: string[] = [];

    for (const desc of desiredDescriptions) {
      if (existingDescriptions.has(desc)) continue;
      const req = this.getSeedListingRequest(event.id, primaryDateId, desc);
      const listing = await this.ticketsService.createListing(
        ctx,
        seller.id,
        seller.level,
        req,
      );
      createdListingIds.push(listing.id);
    }

    const finalListings = await this.ticketsRepository.getBySellerId(ctx, seller.id);
    const finalSeedListings = finalListings.filter(
      (l) => l.eventId === event.id && (l.description || '').startsWith('Seed listing'),
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
    data: Omit<User, 'id' | 'country' | 'currency' | 'createdAt' | 'updatedAt'> & {
      lastUsedProfile?: 'Customer' | 'Provider';
    },
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
      description:
        'Bad Bunny - DeBÍ TiRAR MáS FOToS World Tour. Estadio River Plate, Buenos Aires.',
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
    description: string,
  ): CreateListingRequest {
    if (description.includes('1')) {
      return {
        eventId,
        eventDateId,
        type: TicketType.DigitalTransferable,
        quantity: 2,
        sellTogether: false,
        pricePerTicket: { amount: 15000, currency: 'EUR' },
        description,
        section: 'Platea',
        ticketUnits: [
          { seat: { row: '10', seatNumber: '12' } },
          { seat: { row: '10', seatNumber: '13' } },
        ],
      };
    }

    if (description.includes('2')) {
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
        description,
        section: 'Campo',
      };
    }

    return {
      eventId,
      eventDateId,
      type: TicketType.DigitalNonTransferable,
      quantity: 1,
      sellTogether: true,
      pricePerTicket: { amount: 12000, currency: 'EUR' },
      description,
      section: 'Platea Alta',
    };
  }

  private toDateKey(value: unknown): string {
    const d = value instanceof Date ? value : new Date(String(value));
    const iso = Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
    return iso.slice(0, 10);
  }
}

