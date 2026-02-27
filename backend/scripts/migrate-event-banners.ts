/**
 * Migration script to populate banners metadata for existing events.
 * Scans data/public/event-banners/{eventId}/ for existing images
 * and updates events.json with the banners field.
 *
 * Run with: npx ts-node scripts/migrate-event-banners.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';

interface EventBanner {
  type: 'square' | 'rectangle';
  filename: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface EventBanners {
  square?: EventBanner;
  rectangle?: EventBanner;
}

interface Event {
  id: string;
  name: string;
  createdBy: string;
  banners?: EventBanners;
  [key: string]: unknown;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const BANNERS_DIR = path.join(DATA_DIR, 'public', 'event-banners');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function migrate(): Promise<void> {
  console.log('Starting event banners migration...');

  const eventsContent = await fs.readFile(EVENTS_FILE, 'utf-8');
  const events: Record<string, Event> = JSON.parse(eventsContent);

  let updatedCount = 0;

  for (const [eventId, event] of Object.entries(events)) {
    const eventBannersDir = path.join(BANNERS_DIR, eventId);

    try {
      const files = await fs.readdir(eventBannersDir);
      const banners: EventBanners = {};

      for (const file of files) {
        const match = file.match(/^(square|rectangle)\.(png|jpg|jpeg|webp)$/i);
        if (!match) continue;

        const type = match[1].toLowerCase() as 'square' | 'rectangle';
        const ext = match[2].toLowerCase();
        const filePath = path.join(eventBannersDir, file);

        const stats = await fs.stat(filePath);
        const buffer = await fs.readFile(filePath);
        const metadata = await sharp(buffer).metadata();

        if (!metadata.width || !metadata.height) {
          console.warn(`  Could not read dimensions for ${file}, skipping`);
          continue;
        }

        const banner: EventBanner = {
          type,
          filename: file,
          originalFilename: file,
          contentType: getMimeType(ext),
          sizeBytes: stats.size,
          width: metadata.width,
          height: metadata.height,
          uploadedBy: event.createdBy,
          uploadedAt: stats.mtime.toISOString(),
        };

        banners[type] = banner;
        console.log(`  Found ${type} banner: ${file} (${metadata.width}x${metadata.height})`);
      }

      if (Object.keys(banners).length > 0) {
        events[eventId].banners = banners;
        updatedCount++;
        console.log(`Updated event ${eventId} (${event.name}) with ${Object.keys(banners).length} banner(s)`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`No banner directory for event ${eventId}`);
      } else {
        console.error(`Error processing event ${eventId}:`, error);
      }
    }
  }

  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));

  console.log(`\nMigration complete. Updated ${updatedCount} event(s).`);
}

migrate().catch(console.error);
