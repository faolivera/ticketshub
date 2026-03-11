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
import { adminService } from '@/api/services/admin.service';
import type {
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
    },
  ],
};

type Phase = 'upload' | 'preview' | 'result' | 'error';

export function ImportEvents() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('upload');
  const [payload, setPayload] = useState<ImportEventsPayload | null>(null);
  const [preview, setPreview] = useState<ImportEventsPreviewItem[] | null>(null);
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
    if (!payload) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.executeImport(payload);
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
  }, [payload]);

  const handleBackToUpload = useCallback(() => {
    setPhase('upload');
    setPayload(null);
    setPreview(null);
    setValidationErrors(null);
    setResult(null);
    setError(null);
  }, []);

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

      {phase === 'preview' && preview && payload && (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.importEvents.previewTitle')}</CardTitle>
            <CardDescription>
              {t('admin.importEvents.previewDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Sections</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((ev) => (
                    <TableRow key={ev.index}>
                      <TableCell>{ev.index + 1}</TableCell>
                      <TableCell className="font-medium">{ev.name}</TableCell>
                      <TableCell>{ev.venue}</TableCell>
                      <TableCell className="font-mono text-xs break-all">
                        {ev.slug}
                      </TableCell>
                      <TableCell>{ev.datesCount}</TableCell>
                      <TableCell>
                        {ev.sections.map((s) => s.name).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleConfirmImport}
                disabled={loading}
              >
                {loading
                  ? t('admin.importEvents.importing')
                  : t('admin.importEvents.confirmImport', {
                      count: payload.events.length,
                    })}
              </Button>
              <Button variant="outline" onClick={handleBackToUpload}>
                {t('admin.importEvents.cancel')}
              </Button>
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
