import { FC } from 'react';
import { Ticket } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { useIsMobile } from '@/app/components/ui/use-mobile';

export type EventBannerVariant = 'square' | 'rectangle';

/**
 * Hook that returns the appropriate banner variant based on screen size.
 * Mobile devices use square banners, desktop uses rectangle.
 */
export function useEventBannerVariant(): EventBannerVariant {
  const isMobile = useIsMobile();
  return isMobile ? 'square' : 'rectangle';
}

interface EventBannerProps {
  /**
   * Which aspect ratio variant to display
   * - square: 1:1 ratio (used on mobile, thumbnails)
   * - rectangle: 16:9 ratio (used on desktop cards)
   */
  variant: EventBannerVariant;

  /**
   * Square banner URL (required)
   */
  squareUrl?: string;

  /**
   * Rectangle banner URL (optional)
   */
  rectangleUrl?: string;

  /**
   * Alt text for the image
   */
  alt: string;

  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * EventBanner component that displays event images with smart fallback.
 *
 * When variant="rectangle" but only squareUrl is available:
 * - Shows the square image with a blurred/stretched background fill
 *
 * When no images are available:
 * - Shows a gradient placeholder with ticket icon
 */
export const EventBanner: FC<EventBannerProps> = ({
  variant,
  squareUrl,
  rectangleUrl,
  alt,
  className,
}) => {
  const primaryUrl = variant === 'rectangle' ? (rectangleUrl || squareUrl) : squareUrl;
  const needsFallbackEffect = variant === 'rectangle' && !rectangleUrl && squareUrl;

  if (!primaryUrl) {
    return (
      <div
        className={cn(
          'w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-start justify-center',
          variant === 'square' ? 'aspect-square' : 'aspect-video',
          className
        )}
      >
        <Ticket className="w-16 h-16 text-white opacity-50" />
      </div>
    );
  }

  if (needsFallbackEffect) {
    return (
      <div
        className={cn(
          'w-full relative overflow-hidden aspect-video',
          className
        )}
      >
        <div
          className="absolute inset-0 scale-150"
          style={{
            backgroundImage: `url(${squareUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
          }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={squareUrl}
            alt={alt}
            loading="lazy"
            className="h-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full overflow-hidden flex items-start justify-center',
        variant === 'square' ? 'aspect-square' : 'aspect-video',
        className
      )}
    >
      <img
        src={primaryUrl}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
  );
};
