import { Helmet } from 'react-helmet-async';

export interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Injects a JSON-LD script into the document head for structured data (Organization, Event, etc.).
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
}
