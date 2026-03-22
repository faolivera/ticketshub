# Featured Events Filter & Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Eventos Destacados" filter toggle to the admin featured events page, and add a crop-from-square-banner button that lets admins select a rectangle region from the event's existing square image.

**Architecture:** The highlighted filter is propagated backend → repository (Prisma where clause) → service → controller → frontend service → UI toggle. The crop feature extends `AvatarCropModal` with new optional props (`aspect`, `imageSrc`, `outputWidth`, `outputHeight`) so it can be reused for banner cropping without breaking the existing avatar use case.

**Tech Stack:** NestJS, Prisma, TypeScript (strict), React 18, react-easy-crop, Canvas API

---

## File Map

| File | Change |
|------|--------|
| `backend/src/modules/events/events.repository.interface.ts` | Add `highlighted?` to `getAllEventsPaginated` options |
| `backend/src/modules/events/events.repository.ts` | Add `highlight: true` to Prisma `where` when `highlighted=true` |
| `backend/src/modules/events/events.service.ts` | Pass `highlighted` through to repository |
| `backend/src/modules/admin/admin.api.ts` | Add `highlighted?` to `AdminAllEventsQuery`; add `squareBannerUrl?` to `AdminAllEventItem` |
| `backend/src/modules/admin/admin.service.ts` | Pass `highlighted` to events service; extract `squareBannerUrl` from `event.banners` |
| `frontend/src/api/types/admin.ts` | Mirror backend: add `highlighted?` and `squareBannerUrl?` |
| `frontend/src/api/services/admin.service.ts` | Serialize `highlighted` in `getAllEvents` query params |
| `frontend/src/app/components/Avatarcropmodal.tsx` | Add `aspect`, `imageSrc`, `outputWidth`, `outputHeight` props |
| `frontend/src/app/pages/admin/FeaturedEventsManagement.tsx` | Add filter toggle button + "Recortar" crop button per row |

---

## Task 1: Backend — Add `highlighted` filter to repository layer

**Files:**
- Modify: `backend/src/modules/events/events.repository.interface.ts`
- Modify: `backend/src/modules/events/events.repository.ts`

- [ ] **Step 1: Update repository interface**

In `events.repository.interface.ts`, find the `getAllEventsPaginated` signature and add `highlighted?`:

```ts
getAllEventsPaginated(
  ctx: Ctx,
  options: { page: number; limit: number; search?: string; highlighted?: boolean },
): Promise<{ events: Event[]; total: number }>;
```

- [ ] **Step 2: Update repository implementation**

In `events.repository.ts`, update `getAllEventsPaginated` to build the where clause:

```ts
async getAllEventsPaginated(
  _ctx: Ctx,
  options: { page: number; limit: number; search?: string; highlighted?: boolean },
): Promise<{ events: Event[]; total: number }> {
  this.logger.debug(_ctx, 'getAllEventsPaginated', { page: options.page, limit: options.limit, highlighted: options.highlighted });

  const where: Prisma.EventWhereInput = {
    ...(options.search
      ? { name: { contains: options.search, mode: 'insensitive' } }
      : {}),
    ...(options.highlighted === true ? { highlight: true } : {}),
  };

  const [events, total] = await Promise.all([
    this.prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    this.prisma.event.count({ where }),
  ]);

  return { events: events.map((e) => this.mapToEvent(e)), total };
}
```

> Note: Check whether `Prisma` namespace is already imported in this file. If not, add `import { Prisma } from '@prisma/client';` at the top.

- [ ] **Step 3: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/events/events.repository.interface.ts \
        backend/src/modules/events/events.repository.ts
git commit -m "feat: add highlighted filter to getAllEventsPaginated"
```

---

## Task 2: Backend — Wire `highlighted` through service and admin layer; expose `squareBannerUrl`

**Files:**
- Modify: `backend/src/modules/events/events.service.ts`
- Modify: `backend/src/modules/admin/admin.api.ts`
- Modify: `backend/src/modules/admin/admin.service.ts`

- [ ] **Step 1: Update `EventsService.getAllEventsPaginated`**

In `events.service.ts`, update the method signature and pass through:

```ts
async getAllEventsPaginated(
  ctx: Ctx,
  options: { page: number; limit: number; search?: string; highlighted?: boolean },
): Promise<{ events: Event[]; total: number }> {
  return await this.eventsRepository.getAllEventsPaginated(ctx, options);
}
```

- [ ] **Step 2: Update `AdminAllEventsQuery` and `AdminAllEventItem` in backend api.ts**

In `backend/src/modules/admin/admin.api.ts`:

```ts
export interface AdminAllEventsQuery {
  page?: number;
  limit?: number;
  search?: string;
  highlighted?: boolean;
}
```

And in `AdminAllEventItem`, add:

```ts
/** URL of the event's square banner image, if it exists. Used for crop-to-rectangle flow. */
squareBannerUrl?: string;
```

- [ ] **Step 3: Update `AdminService.getAllEvents` to pass `highlighted` and extract `squareBannerUrl`**

In `admin.service.ts`, update the `getAllEvents` call and the event mapping:

```ts
async getAllEvents(
  ctx: Ctx,
  query: AdminAllEventsQuery,
): Promise<AdminAllEventsResponse> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  this.logger.log(
    ctx,
    `Getting all events - page: ${page}, limit: ${limit}, search: ${query.search || 'none'}, highlighted: ${query.highlighted ?? false}`,
  );

  const { events, total } = await this.eventsService.getAllEventsPaginated(
    ctx,
    { page, limit, search: query.search, highlighted: query.highlighted },
  );
  // ... rest of method unchanged ...
```

And inside the `events.map` callback, extract squareBannerUrl:

```ts
const squareBannerUrl =
  banners &&
  typeof banners === 'object' &&
  typeof (banners as Record<string, unknown>).square === 'string'
    ? (banners as Record<string, string>).square
    : undefined;

return {
  // ... existing fields ...
  squareBannerUrl,
};
```

- [ ] **Step 4: Update `AdminController` to accept `highlighted` query param**

Find the `getAllEvents` controller method (in `admin.controller.ts`). Add `highlighted` to the query param extraction:

```ts
@Get('events/all')
async getAllEvents(
  @Ctx() ctx: Context,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('search') search?: string,
  @Query('highlighted') highlighted?: string,
): Promise<ApiResponse<AdminAllEventsResponse>> {
  const query: AdminAllEventsQuery = {
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    search,
    highlighted: highlighted === 'true' ? true : undefined,
  };
  return { success: true, data: await this.adminService.getAllEvents(ctx, query) };
}
```

> Read the existing controller method first to preserve any auth decorators or guards.

- [ ] **Step 5: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Write unit test for `getAllEvents` with `highlighted` filter**

File: `backend/src/test/unit/modules/admin/admin.service.spec.ts` (create if not exists).

The admin service depends on `eventsService`, `usersService`, `ticketsService`. Mock them all. Test that when `highlighted: true` is passed, it's forwarded to `eventsService.getAllEventsPaginated`.

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../../../../src/modules/admin/admin.service';
import { EventsService } from '../../../../src/modules/events/events.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { ContextLogger } from '../../../../src/common/logger/context-logger';

const mockCtx = { requestId: 'test' } as any;

describe('AdminService.getAllEvents', () => {
  let service: AdminService;
  let eventsService: jest.Mocked<Pick<EventsService, 'getAllEventsPaginated'>>;

  beforeEach(async () => {
    eventsService = {
      getAllEventsPaginated: jest.fn().mockResolvedValue({ events: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: EventsService, useValue: eventsService },
        { provide: UsersService, useValue: { findByIds: jest.fn().mockResolvedValue([]) } },
        { provide: TicketsService, useValue: { getListingStatsByEventIds: jest.fn().mockResolvedValue(new Map()) } },
        { provide: ContextLogger, useValue: { log: jest.fn(), debug: jest.fn(), error: jest.fn() } },
        // Add any other injected dependencies AdminService has
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('passes highlighted=true to eventsService when query.highlighted is true', async () => {
    await service.getAllEvents(mockCtx, { highlighted: true });
    expect(eventsService.getAllEventsPaginated).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({ highlighted: true }),
    );
  });

  it('does not pass highlighted when query.highlighted is undefined', async () => {
    await service.getAllEvents(mockCtx, {});
    expect(eventsService.getAllEventsPaginated).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({ highlighted: undefined }),
    );
  });
});
```

> **Important:** `AdminService` may have more injected dependencies. Run `npx tsc --noEmit` first and read the constructor to find all providers. Add them as mocks.

- [ ] **Step 7: Run the test**

```bash
cd backend && npm test -- --testPathPattern="admin.service.spec"
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/events/events.service.ts \
        backend/src/modules/admin/admin.api.ts \
        backend/src/modules/admin/admin.service.ts \
        backend/src/modules/admin/admin.controller.ts \
        backend/src/test/unit/modules/admin/admin.service.spec.ts
git commit -m "feat: wire highlighted filter and squareBannerUrl through admin events endpoint"
```

---

## Task 3: Frontend — Update types and service

**Files:**
- Modify: `frontend/src/api/types/admin.ts`
- Modify: `frontend/src/api/services/admin.service.ts`

- [ ] **Step 1: Update frontend types to mirror backend**

In `frontend/src/api/types/admin.ts`:

```ts
export interface AdminAllEventsQuery {
  page?: number;
  limit?: number;
  search?: string;
  highlighted?: boolean;
}
```

And in `AdminAllEventItem`, add:

```ts
/** URL of the event's square banner. Present when the event has one. */
squareBannerUrl?: string;
```

- [ ] **Step 2: Update `adminService.getAllEvents` to serialize `highlighted`**

In `frontend/src/api/services/admin.service.ts`, find the `getAllEvents` method and add:

```ts
if (query.highlighted) params.append('highlighted', 'true');
```

alongside the existing `page`/`limit`/`search` params.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/types/admin.ts \
        frontend/src/api/services/admin.service.ts
git commit -m "feat: add highlighted filter and squareBannerUrl to frontend admin types and service"
```

---

## Task 4: Frontend — Extend `AvatarCropModal` with flexible props

**Files:**
- Modify: `frontend/src/app/components/Avatarcropmodal.tsx`

The modal currently accepts `outputSize` (square). We need it to support:
- `aspect?: number` — crop aspect ratio passed to `<Cropper>` (default `1`)
- `imageSrc?: string` — pre-load this image on open; skip file-picker step
- `outputWidth?: number` / `outputHeight?: number` — canvas export dimensions (override `outputSize` for non-square)

**All existing behavior is preserved** when the new props are omitted.

- [ ] **Step 1: Update `getCroppedBlob` helper to accept separate width/height**

```ts
async function getCroppedBlob(
  imageSrc: string,
  croppedAreaPixels: Area,
  outputWidth = 400,
  outputHeight = 400,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      'image/jpeg',
      0.92,
    );
  });
}
```

- [ ] **Step 2: Update `AvatarCropModalProps` interface**

```ts
interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (blob: Blob) => Promise<void>;
  /** Square output size in px (default 400). Used when outputWidth/outputHeight are not specified. */
  outputSize?: number;
  /** Output canvas width in px. Overrides outputSize when provided. */
  outputWidth?: number;
  /** Output canvas height in px. Overrides outputSize when provided. */
  outputHeight?: number;
  /** Crop aspect ratio. Default 1 (square). Pass e.g. 1400/400 for banner crops. */
  aspect?: number;
  /** Pre-load this image URL on open. When provided, file-picker step is skipped. */
  imageSrc?: string;
  cropShape?: 'round' | 'rect';
}
```

- [ ] **Step 3: Update component body**

In the component function, initialize state from `imageSrc` prop and pass through new props:

```ts
export default function AvatarCropModal({
  open,
  onClose,
  onSave,
  outputSize = 400,
  outputWidth,
  outputHeight,
  aspect = 1,
  imageSrc: externalImageSrc,
  cropShape = 'round',
}: AvatarCropModalProps) {
  const { t } = useTranslation();
  const [imageSrc, setImageSrc] = useState<string | null>(externalImageSrc ?? null);
  // ... rest of state unchanged

  // Reset when modal opens/closes — also handle new externalImageSrc
  const handleClose = useCallback(() => {
    setImageSrc(externalImageSrc ?? null);
    setSaveError(null);
    onClose();
  }, [onClose, externalImageSrc]);

  // When externalImageSrc changes (e.g. different event selected), update state
  useEffect(() => {
    if (open) setImageSrc(externalImageSrc ?? null);
  }, [open, externalImageSrc]);
```

In `handleSave`, update the `getCroppedBlob` call:

```ts
const w = outputWidth ?? outputSize;
const h = outputHeight ?? outputSize;
const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, w, h);
```

In the JSX, pass `aspect` to `<Cropper>` **and update the container's `aspectRatio` style** to match (currently hardcoded to `"1"`, which would clip the crop area for non-square ratios):

```tsx
<div
  className="relative w-full overflow-hidden rounded-xl bg-muted"
  style={{ aspectRatio: String(aspect) }}
>
  <Cropper
    image={imageSrc}
    crop={crop}
    zoom={zoom}
    aspect={aspect}
    cropShape={cropShape}
    showGrid={false}
    onCropChange={setCrop}
    onZoomChange={setZoom}
    onCropComplete={onCropComplete}
  />
</div>
```

> Without this fix, the cropper container stays square and clips the 3.5:1 banner crop region, making the feature unusable.

When `externalImageSrc` is provided, **hide the "Change Image" footer button** (the pre-loaded image is the source; the admin shouldn't swap it out from within the modal):

```tsx
{imageSrc && !externalImageSrc && (
  <label className="flex-1 cursor-pointer">
    {/* ... change image label ... */}
  </label>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. The existing `UserProfile.tsx` usage (`cropShape="round"`, no new props) must still compile without changes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/Avatarcropmodal.tsx
git commit -m "feat: extend AvatarCropModal with aspect, imageSrc, outputWidth, outputHeight props"
```

---

## Task 5: Frontend — Add filter toggle and crop button to `FeaturedEventsManagement`

**Files:**
- Modify: `frontend/src/app/pages/admin/FeaturedEventsManagement.tsx`

- [ ] **Step 1: Add `highlightedOnly` state and wire to fetch**

At the top of the component, add:

```ts
const [highlightedOnly, setHighlightedOnly] = useState(false);
```

Update `fetchEvents` signature to receive it and pass to `adminService.getAllEvents`:

```ts
const fetchEvents = async (pageNum: number, searchTerm: string, onlyHighlighted: boolean) => {
  // ...
  const data = await adminService.getAllEvents({
    page: pageNum,
    limit: PAGE_SIZE,
    search: searchTerm.trim() || undefined,
    highlighted: onlyHighlighted || undefined,
  });
  // ...
};
```

Update `useEffect` to include `highlightedOnly` in deps:

```ts
useEffect(() => {
  fetchEvents(1, search, highlightedOnly);
}, [search, highlightedOnly]);
```

Update `handlePageChange` to pass the current `highlightedOnly` value:

```ts
const handlePageChange = (newPage: number) => {
  if (newPage < 1 || newPage > totalPages) return;
  fetchEvents(newPage, search, highlightedOnly);
};
```

- [ ] **Step 2: Add the filter toggle button**

In the toolbar `div` (the one with `flex gap-2`), add a toggle button alongside the search:

```tsx
<Button
  onClick={() => setHighlightedOnly((v) => !v)}
  variant={highlightedOnly ? 'default' : 'outline'}
>
  <Star className={cn('h-4 w-4 mr-1', highlightedOnly && 'fill-current')} />
  {t('admin.featuredEvents.showHighlightedOnly')}
</Button>
```

> `cn` is already used elsewhere in the codebase — import from `@/app/components/ui/utils` if not already imported.

- [ ] **Step 3: Add crop modal state**

```ts
const [cropModalEvent, setCropModalEvent] = useState<{ id: string; squareBannerUrl: string } | null>(null);
```

- [ ] **Step 4: Add "Recortar" button in the upload cell**

Replace the existing upload cell content with a flex group containing both buttons:

```tsx
<TableCell>
  <div className="flex gap-1 flex-wrap">
    <input
      ref={(el) => setFileInputRef(event.id, el)}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(e) => handleFileChange(event.id, e)}
    />
    <Button
      size="sm"
      variant="outline"
      onClick={() => fileInputRefs.current[event.id]?.click()}
      disabled={actionLoading === event.id}
    >
      {actionLoading === event.id
        ? t('admin.featuredEvents.uploading')
        : t('admin.featuredEvents.uploadRectangle')}
      <Upload className="h-4 w-4 ml-1" />
    </Button>
    {event.squareBannerUrl && (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCropModalEvent({ id: event.id, squareBannerUrl: event.squareBannerUrl! })}
        disabled={actionLoading === event.id}
      >
        <ImageIcon className="h-4 w-4 mr-1" />
        {t('admin.featuredEvents.cropFromSquare')}
      </Button>
    )}
  </div>
</TableCell>
```

- [ ] **Step 5: Add crop modal handler and JSX**

Add the save handler:

```ts
const handleCropSave = async (blob: Blob) => {
  if (!cropModalEvent) return;
  const file = new File([blob], 'banner-rectangle.jpg', { type: 'image/jpeg' });
  await adminService.uploadEventBanner(cropModalEvent.id, 'rectangle', file);
  setEvents((prev) =>
    prev.map((e) => (e.id === cropModalEvent.id ? { ...e, hasRectangleBanner: true } : e))
  );
};
```

Add the modal at the bottom of the JSX (before the closing `</div>`):

```tsx
<AvatarCropModal
  open={cropModalEvent !== null}
  onClose={() => setCropModalEvent(null)}
  onSave={handleCropSave}
  imageSrc={cropModalEvent?.squareBannerUrl}
  aspect={1400 / 400}
  outputWidth={1400}
  outputHeight={400}
  cropShape="rect"
/>
```

Import `AvatarCropModal` at the top:

```ts
import AvatarCropModal from '@/app/components/Avatarcropmodal';
```

- [ ] **Step 6: Add i18n keys**

In `frontend/src/i18n/locales/en.json`, under `admin.featuredEvents`, add:

```json
"showHighlightedOnly": "Highlighted Events",
"cropFromSquare": "Crop from square"
```

In `frontend/src/i18n/locales/es.json`, under `admin.featuredEvents`, add:

```json
"showHighlightedOnly": "Eventos Destacados",
"cropFromSquare": "Recortar desde cuadrada"
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/pages/admin/FeaturedEventsManagement.tsx \
        frontend/src/i18n/locales/en.json \
        frontend/src/i18n/locales/es.json
git commit -m "feat: add highlighted filter toggle and crop-from-square button to featured events admin"
```

---

## Task 6: Backend — Run full test suite

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 2: Run TypeScript compile one more time**

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Expected: no errors on either side.
