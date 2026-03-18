import type { CSSProperties, ReactNode } from 'react';

/**
 * Same content column as the home page (hero, search, grid) and AppHeader inner row:
 * max 1280px, centered, 24px horizontal padding — left edge under logo, right under user menu.
 * Use this as the default desktop content shell for authenticated/marketing inner pages.
 */
export const PAGE_CONTENT_MAX_WIDTH_PX = 1280;
export const PAGE_CONTENT_GUTTER_PX = 24;

type PageContentMaxWidthProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function PageContentMaxWidth({ children, className, style }: PageContentMaxWidthProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: PAGE_CONTENT_MAX_WIDTH_PX,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: PAGE_CONTENT_GUTTER_PX,
        paddingRight: PAGE_CONTENT_GUTTER_PX,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
