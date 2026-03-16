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
import { adminService } from '../../../api/services/admin.service';
import type {
  AdminGetEventsRankingConfigResponse,
  AdminPatchEventsRankingConfigRequest,
} from '../../../api/types/admin';

const MIN_WEIGHT = 0;
const MAX_WEIGHT = 10;
const MIN_JOB_INTERVAL = 1;
const MAX_JOB_INTERVAL = 1440;

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

  useEffect(() => {
    fetchConfig();
  }, []);

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
    </div>
  );
}

export default EventsScoreConfig;
