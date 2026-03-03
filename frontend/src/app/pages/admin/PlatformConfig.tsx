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
import type { PlatformConfig as PlatformConfigType } from '../../../api/types/admin';

const MIN_FEE = 0;
const MAX_FEE = 100;
const MIN_PAYMENT_MINUTES = 1;
const MAX_PAYMENT_MINUTES = 1440;
const MIN_ADMIN_HOURS = 1;
const MAX_ADMIN_HOURS = 168;

export function PlatformConfig() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<PlatformConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [buyerFee, setBuyerFee] = useState('');
  const [sellerFee, setSellerFee] = useState('');
  const [paymentTimeout, setPaymentTimeout] = useState('');
  const [adminReviewHours, setAdminReviewHours] = useState('');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getPlatformConfig();
      setConfig(data);
      setBuyerFee(String(data.buyerPlatformFeePercentage));
      setSellerFee(String(data.sellerPlatformFeePercentage));
      setPaymentTimeout(String(data.paymentTimeoutMinutes));
      setAdminReviewHours(String(data.adminReviewTimeoutHours));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('admin.platformConfig.loadError')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    const buyer = Number(buyerFee);
    const seller = Number(sellerFee);
    const payment = Number(paymentTimeout);
    const adminHours = Number(adminReviewHours);

    if (
      Number.isNaN(buyer) ||
      Number.isNaN(seller) ||
      Number.isNaN(payment) ||
      Number.isNaN(adminHours)
    ) {
      setError('All fields must be numbers.');
      return;
    }
    if (buyer < MIN_FEE || buyer > MAX_FEE) {
      setError(`Buyer fee must be between ${MIN_FEE} and ${MAX_FEE}.`);
      return;
    }
    if (seller < MIN_FEE || seller > MAX_FEE) {
      setError(`Seller fee must be between ${MIN_FEE} and ${MAX_FEE}.`);
      return;
    }
    if (payment < MIN_PAYMENT_MINUTES || payment > MAX_PAYMENT_MINUTES) {
      setError(
        `Payment timeout must be between ${MIN_PAYMENT_MINUTES} and ${MAX_PAYMENT_MINUTES}.`
      );
      return;
    }
    if (adminHours < MIN_ADMIN_HOURS || adminHours > MAX_ADMIN_HOURS) {
      setError(
        `Admin review timeout must be between ${MIN_ADMIN_HOURS} and ${MAX_ADMIN_HOURS}.`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await adminService.updatePlatformConfig({
        buyerPlatformFeePercentage: buyer,
        sellerPlatformFeePercentage: seller,
        paymentTimeoutMinutes: Math.round(payment),
        adminReviewTimeoutHours: Math.round(adminHours),
      });
      setSuccess(t('admin.platformConfig.saved'));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('admin.platformConfig.saveError')
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.platformConfig.title')}</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.platformConfig.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.platformConfig.description')}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/15 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.platformConfig.title')}</CardTitle>
          <CardDescription>
            {t('admin.platformConfig.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="buyerFee">
                {t('admin.platformConfig.buyerPlatformFeePercentage')}
              </Label>
              <Input
                id="buyerFee"
                type="number"
                min={MIN_FEE}
                max={MAX_FEE}
                step={0.01}
                value={buyerFee}
                onChange={(e) => setBuyerFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerFee">
                {t('admin.platformConfig.sellerPlatformFeePercentage')}
              </Label>
              <Input
                id="sellerFee"
                type="number"
                min={MIN_FEE}
                max={MAX_FEE}
                step={0.01}
                value={sellerFee}
                onChange={(e) => setSellerFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTimeout">
                {t('admin.platformConfig.paymentTimeoutMinutes')}
              </Label>
              <Input
                id="paymentTimeout"
                type="number"
                min={MIN_PAYMENT_MINUTES}
                max={MAX_PAYMENT_MINUTES}
                value={paymentTimeout}
                onChange={(e) => setPaymentTimeout(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminReviewHours">
                {t('admin.platformConfig.adminReviewTimeoutHours')}
              </Label>
              <Input
                id="adminReviewHours"
                type="number"
                min={MIN_ADMIN_HOURS}
                max={MAX_ADMIN_HOURS}
                value={adminReviewHours}
                onChange={(e) => setAdminReviewHours(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('admin.platformConfig.saving') : t('admin.platformConfig.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
