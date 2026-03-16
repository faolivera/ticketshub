import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { adminService } from '@/api/services/admin.service';
import type {
  ImportEventItem,
  ImportEventsPayload,
  ImportEventsPreviewItem,
  ImportEventValidationError,
  ImportEventsResultResponse,
} from '@/api/types/admin';
import { Upload, Download, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const SAMPLE_PAYLOAD: ImportEventsPayload = {
  events: [
    {
      name: 'Sample Concert 2025',
      category: 'Concert',
      venue: 'Main Arena',
      location: {
        line1: '123 Main St',
        city: 'Buenos Aires',
        countryCode: 'AR',
      },
      dates: ['2025-07-10T20:00:00.000Z', '2025-07-11T20:00:00.000Z'],
      sections: [
        { name: 'VIP', seatingType: 'numbered' },
        { name: 'General', seatingType: 'unnumbered' },
      ],
      sourceCode: 'sample',
      sourceId: 'sample-1',
    },
  ],
};

type Phase = 'upload' | 'preview' | 'result' | 'error';

/** Display slug without the -preview-N suffix (final slug will get event id on create if not custom). */
function slugWithoutPreview(slug: string): string {
  return slug.replace(/-preview-\d+$/, '');
}

/** Resolve country code to display name (ISO 3166-1 alpha-2). */
function getCountryName(code: string): string {
  const names: Record<string, string> = {
    AR: 'Argentina',
    BR: 'Brazil',
    CL: 'Chile',
    CO: 'Colombia',
    ES: 'Spain',
    MX: 'Mexico',
    PE: 'Peru',
    US: 'United States',
    UY: 'Uruguay',
  };
  return names[code?.toUpperCase() ?? ''] ?? code ?? '';
}

export function ImportEvents() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('upload');
  const [payload, setPayload] = useState<ImportEventsPayload | null>(null);
  const [preview, setPreview] = useState<ImportEventsPreviewItem[] | null>(null);
  const [eventsForImport, setEventsForImport] = useState<ImportEventItem[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [validationErrors, setValidationErrors] = useState<
    ImportEventValidationError[] | null
  >(null);
  const [result, setResult] = useState<ImportEventsResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      setValidationErrors(null);
      setPreview(null);
      setResult(null);
      setLoading(true);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as ImportEventsPayload;
        if (!parsed.events || !Array.isArray(parsed.events)) {
          setError('Invalid format: expected { "events": [...] }');
          setPhase('error');
          return;
        }
        const response = await adminService.getImportPreview(parsed);
        if ('valid' in response && response.valid === false) {
          setValidationErrors(response.errors);
          setPhase('error');
          return;
        }
        setPayload(parsed);
        setPreview(response.events);
        setEventsForImport(response.eventsForImport ?? []);
        setSelectedIndices(new Set(response.events.map((_, i) => i)));
        setPhase('preview');
      } catch (err) {
        if (err instanceof SyntaxError) {
          setError('Invalid JSON: ' + err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to validate file');
        }
        setPhase('error');
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    },
    []
  );

  const handleConfirmImport = useCallback(async () => {
    if (!eventsForImport?.length) return;
    const selected = eventsForImport.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.executeImport({ events: selected });
      setResult(data);
      setPhase('result');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { errors?: ImportEventValidationError[] } }; message?: string };
      if (apiError.response?.data?.errors) {
        setValidationErrors(apiError.response.data.errors);
        setPhase('error');
      } else {
        setError(apiError instanceof Error ? apiError.message : 'Import failed');
        setPhase('error');
      }
    } finally {
      setLoading(false);
    }
  }, [eventsForImport, selectedIndices]);

  const handleBackToUpload = useCallback(() => {
    setPhase('upload');
    setPayload(null);
    setPreview(null);
    setEventsForImport(null);
    setSelectedIndices(new Set());
    setValidationErrors(null);
    setResult(null);
    setError(null);
  }, []);

  const toggleSelectIndex = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!preview?.length) return;
    const allSelected = preview.every((_, i) => selectedIndices.has(i));
    setSelectedIndices(allSelected ? new Set() : new Set(preview.map((_, i) => i)));
  }, [preview, selectedIndices]);

  const selectAll = useCallback(() => {
    if (!preview?.length) return;
    setSelectedIndices(new Set(preview.map((_, i) => i)));
  }, [preview]);

  const selectNone = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const updateEventAt = useCallback(
    (index: number, patch: Partial<ImportEventItem>) => {
      setEventsForImport((prev) => {
        if (!prev) return prev;
        return prev.map((e, i) => (i === index ? { ...e, ...patch } : e));
      });
    },
    [],
  );

  const handleDownloadSample = useCallback(() => {
    const blob = new Blob([JSON.stringify(SAMPLE_PAYLOAD, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-events-sample.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.importEvents.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.importEvents.description')}
        </p>
      </div>

      {phase === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.importEvents.selectFile')}</CardTitle>
            <CardDescription>
              {t('admin.importEvents.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                disabled={loading}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer cursor-pointer"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('admin.importEvents.downloadSample')}
              </Button>
            </label>
            {loading && (
              <p className="text-sm text-muted-foreground">
                {t('admin.importEvents.validating')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {phase === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t('admin.importEvents.validationErrors')}
            </CardTitle>
            <CardDescription>
              {t('admin.importEvents.fixErrors')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {validationErrors && validationErrors.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.map((err, i) => (
                  <li key={i}>
                    {t('admin.importEvents.eventIndex', { index: err.index })}
                    {err.field ? ` (${err.field})` : ''}: {err.message}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" onClick={handleBackToUpload}>
              <Upload className="w-4 h-4 mr-2" />
              {t('admin.importEvents.backToUpload')}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === 'preview' && preview && eventsForImport && (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.importEvents.previewTitle')}</CardTitle>
            <CardDescription>
              {t('admin.importEvents.previewDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline font-medium"
              >
                {t('admin.importEvents.selectAllLabel')}
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                type="button"
                onClick={selectNone}
                className="text-primary hover:underline font-medium"
              >
                {t('admin.importEvents.selectNoneLabel')}
              </button>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={preview.length > 0 && preview.every((_, i) => selectedIndices.has(i))}
                        onCheckedChange={toggleSelectAll}
                        aria-label={t('admin.importEvents.selectAll')}
                      />
                    </TableHead>
                    <TableHead className="w-14">{t('admin.importEvents.image')}</TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>{t('admin.importEvents.name')}</TableHead>
                    <TableHead>{t('admin.importEvents.venue')}</TableHead>
                    <TableHead>{t('admin.importEvents.city')}</TableHead>
                    <TableHead>{t('admin.importEvents.country')}</TableHead>
                    <TableHead>{t('admin.importEvents.slug')}</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Sections</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((ev) => {
                    const item = eventsForImport[ev.index];
                    const squareSrc =
                      item?.imageSquareBase64?.startsWith('data:')
                        ? item.imageSquareBase64
                        : item?.imageSquareBase64
                          ? `data:image/jpeg;base64,${item.imageSquareBase64}`
                          : null;
                    const displaySlug = slugWithoutPreview(ev.slug);
                    return (
                      <TableRow key={ev.index}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIndices.has(ev.index)}
                            onCheckedChange={() => toggleSelectIndex(ev.index)}
                            aria-label={t('admin.importEvents.selectEvent', { name: item?.name ?? ev.name })}
                          />
                        </TableCell>
                        <TableCell className="w-14 p-1">
                          {squareSrc ? (
                            <img
                              src={squareSrc}
                              alt=""
                              className="size-12 object-cover rounded border border-border"
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{ev.index + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={item?.name ?? ''}
                            onChange={(e) => updateEventAt(ev.index, { name: e.target.value })}
                            className="h-8 font-medium"
                            placeholder={t('admin.importEvents.namePlaceholder')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item?.venue ?? ''}
                            onChange={(e) => updateEventAt(ev.index, { venue: e.target.value })}
                            className="h-8"
                            placeholder={t('admin.importEvents.venuePlaceholder')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item?.location?.city ?? ''}
                            onChange={(e) =>
                              updateEventAt(ev.index, {
                                location: {
                                  line1: item?.location?.line1 ?? '',
                                  city: e.target.value,
                                  countryCode: item?.location?.countryCode ?? '',
                                },
                              })
                            }
                            className="h-8"
                            placeholder={t('admin.importEvents.cityPlaceholder')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item?.location?.countryCode ?? ''}
                            onChange={(e) =>
                              updateEventAt(ev.index, {
                                location: {
                                  line1: item?.location?.line1 ?? '',
                                  city: item?.location?.city ?? '',
                                  countryCode: e.target.value.toUpperCase().slice(0, 2),
                                },
                              })
                            }
                            className="h-8 w-20"
                            placeholder="AR"
                            title={getCountryName(item?.location?.countryCode ?? '')}
                          />
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          <Input
                            value={item?.slug ?? ''}
                            onChange={(e) =>
                              updateEventAt(ev.index, {
                                slug: e.target.value.trim() || undefined,
                              })
                            }
                            placeholder={displaySlug}
                            className="h-8 font-mono text-xs"
                            title={t('admin.importEvents.slugHint')}
                          />
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-muted-foreground text-sm" title={ev.dateLabels.join(', ')}>
                            {ev.dateLabels.length > 0
                              ? ev.dateLabels
                                  .map((d) =>
                                    new Date(d).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    }),
                                  )
                                  .join(', ')
                              : ev.datesCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          {ev.sections?.length
                            ? ev.sections.map((s) => s.name).join(', ')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                onClick={handleConfirmImport}
                disabled={loading || selectedIndices.size === 0}
              >
                {loading
                  ? t('admin.importEvents.importing')
                  : t('admin.importEvents.confirmImport', {
                      count: selectedIndices.size,
                    })}
              </Button>
              <Button variant="outline" onClick={handleBackToUpload}>
                {t('admin.importEvents.cancel')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('admin.importEvents.selectedCount', { count: selectedIndices.size, total: preview.length })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === 'result' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.failed === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              {result.failed === 0
                ? t('admin.importEvents.importSuccess', {
                    created: result.created,
                    total: result.total,
                  })
                : t('admin.importEvents.importPartialSuccess', {
                    created: result.created,
                    total: result.total,
                    failed: result.failed,
                  })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.results.map((r) => (
                    <TableRow key={r.index}>
                      <TableCell>{r.index + 1}</TableCell>
                      <TableCell>
                        {r.success ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>{r.name ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.slug ?? r.error ?? '-'}
                      </TableCell>
                      <TableCell>
                        {r.success && r.slug ? (
                          <Link
                            to={`/event/${r.slug}`}
                            className="text-primary hover:underline text-sm"
                          >
                            {t('admin.importEvents.viewEvent')}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={handleBackToUpload}>
              <Upload className="w-4 h-4 mr-2" />
              {t('admin.importEvents.backToUpload')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ImportEvents;
