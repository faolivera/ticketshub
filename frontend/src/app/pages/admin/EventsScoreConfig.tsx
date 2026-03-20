import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { adminService } from '@/api/services/admin.service';
import type {
  AdminGetEventsRankingConfigResponse,
  AdminPatchEventsRankingConfigRequest,
  AdminAllEventItem,
} from '@/api/types/admin';

const MIN_WEIGHT = 0;
const MAX_WEIGHT = 10;
const MIN_JOB_INTERVAL = 1;
const MAX_JOB_INTERVAL = 1440;
const EVENTS_PAGE_SIZE = 10;

export function EventsScoreConfig() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AdminGetEventsRankingConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [weightActiveListings, setWeightActiveListings] = useState('');
  const [weightTransactions, setWeightTransactions] = useState('');
  const [weightProximity, setWeightProximity] = useState('');
  const [weightPopular, setWeightPopular] = useState('');
  const [jobIntervalMinutes, setJobIntervalMinutes] = useState('');

  const [events, setEvents] = useState<AdminAllEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsTotalPages, setEventsTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [enqueueing, setEnqueueing] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getEventsRankingConfig();
      setConfig(data);
      setWeightActiveListings(String(data.weightActiveListings));
      setWeightTransactions(String(data.weightTransactions));
      setWeightProximity(String(data.weightProximity));
      setWeightPopular(String(data.weightPopular));
      setJobIntervalMinutes(String(data.jobIntervalMinutes));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (page: number, search: string) => {
    try {
      setEventsLoading(true);
      const data = await adminService.getAllEvents({
        page,
        limit: EVENTS_PAGE_SIZE,
        search: search.trim() || undefined,
      });
      setEvents(data.events);
      setEventsPage(data.page);
      setEventsTotal(data.total);
      setEventsTotalPages(data.totalPages);
    } catch {
      setEvents([]);
      setEventsTotal(0);
      setEventsTotalPages(0);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchEvents(1, searchQuery);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!loading) fetchEvents(1, '');
  }, [loading]);

  const handleSave = async () => {
    const payload: AdminPatchEventsRankingConfigRequest = {};
    const wAl = Number(weightActiveListings);
    const wTx = Number(weightTransactions);
    const wPr = Number(weightProximity);
    const wPop = Number(weightPopular);
    const jobInt = Number(jobIntervalMinutes);
    if (!Number.isNaN(wAl) && wAl >= MIN_WEIGHT && wAl <= MAX_WEIGHT) {
      payload.weightActiveListings = wAl;
    }
    if (!Number.isNaN(wTx) && wTx >= MIN_WEIGHT && wTx <= MAX_WEIGHT) {
      payload.weightTransactions = wTx;
    }
    if (!Number.isNaN(wPr) && wPr >= MIN_WEIGHT && wPr <= MAX_WEIGHT) {
      payload.weightProximity = wPr;
    }
    if (!Number.isNaN(wPop) && wPop >= MIN_WEIGHT && wPop <= MAX_WEIGHT) {
      payload.weightPopular = wPop;
    }
    if (!Number.isNaN(jobInt) && jobInt >= MIN_JOB_INTERVAL && jobInt <= MAX_JOB_INTERVAL) {
      payload.jobIntervalMinutes = jobInt;
    }
    if (Object.keys(payload).length === 0) {
      setError(t('admin.eventsScore.validationRequired'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const data = await adminService.patchEventsRankingConfig(payload);
      setConfig(data);
      setSuccess(t('admin.eventsScore.saveSuccess'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const selectAllEvents = () => {
    setSelectedEventIds(new Set(events.map((e) => e.id)));
  };

  const clearEventSelection = () => {
    setSelectedEventIds(new Set());
  };

  const handleEnqueueRescoring = async () => {
    const ids = Array.from(selectedEventIds);
    if (ids.length === 0) return;
    try {
      setEnqueueing(true);
      setQueueError(null);
      setQueueSuccess(null);
      const data = await adminService.postEventsRankingQueue(ids);
      setQueueSuccess(t('admin.eventsScore.queueSuccess', { count: data.enqueued }));
      setSelectedEventIds(new Set());
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : 'Failed to enqueue');
    } finally {
      setEnqueueing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{t('admin.eventsScore.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.eventsScore.title')}</h1>
        <p className="text-muted-foreground">{t('admin.eventsScore.description')}</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.eventsScore.weightsTitle')}</CardTitle>
          <CardDescription>{t('admin.eventsScore.weightsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="weightActiveListings">{t('admin.eventsScore.weightActiveListings')}</Label>
            <Input
              id="weightActiveListings"
              type="number"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={0.1}
              value={weightActiveListings}
              onChange={(e) => setWeightActiveListings(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weightTransactions">{t('admin.eventsScore.weightTransactions')}</Label>
            <Input
              id="weightTransactions"
              type="number"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={0.1}
              value={weightTransactions}
              onChange={(e) => setWeightTransactions(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weightProximity">{t('admin.eventsScore.weightProximity')}</Label>
            <Input
              id="weightProximity"
              type="number"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={0.1}
              value={weightProximity}
              onChange={(e) => setWeightProximity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weightPopular">{t('admin.eventsScore.weightPopular')}</Label>
            <Input
              id="weightPopular"
              type="number"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={0.1}
              value={weightPopular}
              onChange={(e) => setWeightPopular(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.eventsScore.jobTitle')}</CardTitle>
          <CardDescription>{t('admin.eventsScore.jobDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="jobIntervalMinutes">{t('admin.eventsScore.jobIntervalMinutes')}</Label>
            <Input
              id="jobIntervalMinutes"
              type="number"
              min={MIN_JOB_INTERVAL}
              max={MAX_JOB_INTERVAL}
              value={jobIntervalMinutes}
              onChange={(e) => setJobIntervalMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.eventsScore.jobIntervalHint', { min: MIN_JOB_INTERVAL, max: MAX_JOB_INTERVAL })}
            </p>
          </div>
          {config?.lastRunAt && (
            <p className="text-sm text-muted-foreground">
              {t('admin.eventsScore.lastRunAt')}: {new Date(config.lastRunAt).toLocaleString()}
            </p>
          )}
          {config?.updatedAt && (
            <p className="text-sm text-muted-foreground">
              {t('admin.eventsScore.configUpdatedAt')}: {new Date(config.updatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? t('admin.eventsScore.saving') : t('admin.eventsScore.save')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.eventsScore.queueTitle')}</CardTitle>
          <CardDescription>{t('admin.eventsScore.queueDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queueError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {queueError}
            </div>
          )}
          {queueSuccess && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              {queueSuccess}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 gap-2">
              <Input
                type="search"
                placeholder={t('admin.eventsScore.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="max-w-xs"
                aria-label={t('admin.eventsScore.searchPlaceholder')}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSearch}
                disabled={eventsLoading}
              >
                {t('admin.eventsScore.search')}
              </Button>
            </div>
          </div>

          {eventsLoading ? (
            <p className="text-sm text-muted-foreground">{t('admin.eventsScore.eventsLoading')}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.eventsScore.noEvents')}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllEvents}
                  disabled={enqueueing}
                >
                  {t('admin.eventsScore.selectAll')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearEventSelection}
                  disabled={enqueueing || selectedEventIds.size === 0}
                >
                  {t('admin.eventsScore.clearSelection')}
                </Button>
                <span className="flex items-center text-sm text-muted-foreground">
                  {t('admin.eventsScore.selectedCount', { count: selectedEventIds.size })}
                </span>
              </div>
              <ul className="max-h-[280px] overflow-y-auto space-y-2 rounded-md border p-3">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center gap-3 rounded p-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`event-${event.id}`}
                      checked={selectedEventIds.has(event.id)}
                      onCheckedChange={() => toggleEventSelection(event.id)}
                      disabled={enqueueing}
                    />
                    <label
                      htmlFor={`event-${event.id}`}
                      className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {event.name}
                    </label>
                    <span className="text-xs text-muted-foreground">{event.status}</span>
                  </li>
                ))}
              </ul>
              {eventsTotalPages > 1 && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEvents(eventsPage - 1, searchQuery)}
                    disabled={eventsLoading || eventsPage <= 1}
                  >
                    {t('admin.eventsScore.pagePrev')}
                  </Button>
                  <span className="text-muted-foreground">
                    {t('admin.eventsScore.pageOf', {
                      page: eventsPage,
                      totalPages: eventsTotalPages,
                      total: eventsTotal,
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEvents(eventsPage + 1, searchQuery)}
                    disabled={eventsLoading || eventsPage >= eventsTotalPages}
                  >
                    {t('admin.eventsScore.pageNext')}
                  </Button>
                </div>
              )}
              <Button
                onClick={handleEnqueueRescoring}
                disabled={selectedEventIds.size === 0 || enqueueing}
              >
                {enqueueing
                  ? t('admin.eventsScore.enqueueing')
                  : t('admin.eventsScore.enqueueRescoring')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EventsScoreConfig;
