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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { adminService } from '../../../api/services/admin.service';
import type {
  PlatformConfig as PlatformConfigType,
  CurrencyCode,
} from '../../../api/types/admin';

const MIN_FEE = 0;
const MAX_FEE = 100;
const MIN_PAYMENT_MINUTES = 1;
const MAX_PAYMENT_MINUTES = 1440;
const MIN_ADMIN_HOURS = 1;
const MAX_ADMIN_HOURS = 168;
const MIN_CHAT_POLL_SECONDS = 5;
const MAX_CHAT_POLL_SECONDS = 120;
const MIN_CHAT_MAX_MESSAGES = 10;
const MAX_CHAT_MAX_MESSAGES = 500;

const CURRENCIES: CurrencyCode[] = ['USD', 'ARS', 'EUR', 'GBP'];

/** Only USD and ARS allowed for phone/DNI amount thresholds (conversion uses configured rate). */
const BUYER_AMOUNT_CURRENCIES: ('USD' | 'ARS')[] = ['USD', 'ARS'];

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
  const [chatPollIntervalSeconds, setChatPollIntervalSeconds] = useState('');
  const [chatMaxMessages, setChatMaxMessages] = useState('');
  // Risk engine (initial values from API; backend is single source of defaults)
  const [phoneRequiredEventHours, setPhoneRequiredEventHours] = useState('');
  const [phoneRequiredAmountMajor, setPhoneRequiredAmountMajor] = useState('');
  const [phoneRequiredAmountCurrency, setPhoneRequiredAmountCurrency] =
    useState<'USD' | 'ARS'>('USD');
  const [phoneRequiredQtyTickets, setPhoneRequiredQtyTickets] = useState('');
  const [newAccountDays, setNewAccountDays] = useState('');
  const [dniRequiredEventHours, setDniRequiredEventHours] = useState('');
  const [dniRequiredAmountMajor, setDniRequiredAmountMajor] = useState('');
  const [dniRequiredAmountCurrency, setDniRequiredAmountCurrency] =
    useState<'USD' | 'ARS'>('USD');
  const [dniRequiredQtyTickets, setDniRequiredQtyTickets] = useState('');
  const [dniNewAccountDays, setDniNewAccountDays] = useState('');
  const [unverifiedSellerMaxSales, setUnverifiedSellerMaxSales] = useState('');
  const [unverifiedSellerMaxAmountMajor, setUnverifiedSellerMaxAmountMajor] = useState('');
  const [unverifiedSellerMaxAmountCurrency, setUnverifiedSellerMaxAmountCurrency] =
    useState<CurrencyCode>('USD');
  const [payoutHoldHoursDefault, setPayoutHoldHoursDefault] = useState('');
  const [payoutHoldHoursUnverified, setPayoutHoldHoursUnverified] = useState('');
  const [ticketNotReceivedMinHours, setTicketNotReceivedMinHours] = useState('');
  const [ticketNotReceivedMaxHours, setTicketNotReceivedMaxHours] = useState('');
  const [ticketDidntWorkMinHours, setTicketDidntWorkMinHours] = useState('');
  const [ticketDidntWorkMaxHours, setTicketDidntWorkMaxHours] = useState('');
  const [usdToArs, setUsdToArs] = useState('');

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
      setChatPollIntervalSeconds(String(data.transactionChatPollIntervalSeconds));
      setChatMaxMessages(String(data.transactionChatMaxMessages));
      const re = data.riskEngine;
      if (re?.buyer) {
        setPhoneRequiredEventHours(String(re.buyer.phoneRequiredEventHours));
        setPhoneRequiredAmountMajor(
          String((re.buyer.phoneRequiredAmount?.amount ?? 0) / 100)
        );
        setPhoneRequiredAmountCurrency(
          (re.buyer.phoneRequiredAmount?.currency === 'ARS' ? 'ARS' : 'USD') as 'USD' | 'ARS'
        );
        setPhoneRequiredQtyTickets(String(re.buyer.phoneRequiredQtyTickets));
        setNewAccountDays(String(re.buyer.newAccountDays));
        setDniRequiredEventHours(String(re.buyer.dniRequiredEventHours));
        setDniRequiredAmountMajor(
          String((re.buyer.dniRequiredAmount?.amount ?? 0) / 100)
        );
        setDniRequiredAmountCurrency(
          (re.buyer.dniRequiredAmount?.currency === 'ARS' ? 'ARS' : 'USD') as 'USD' | 'ARS'
        );
        setDniRequiredQtyTickets(String(re.buyer.dniRequiredQtyTickets));
        setDniNewAccountDays(String(re.buyer.dniNewAccountDays));
      }
      if (re?.seller) {
        setUnverifiedSellerMaxSales(String(re.seller.unverifiedSellerMaxSales));
        setUnverifiedSellerMaxAmountMajor(
          String((re.seller.unverifiedSellerMaxAmount?.amount ?? 0) / 100)
        );
        setUnverifiedSellerMaxAmountCurrency(
          (re.seller.unverifiedSellerMaxAmount?.currency as CurrencyCode) ?? 'USD'
        );
        setPayoutHoldHoursDefault(String(re.seller.payoutHoldHoursDefault));
        setPayoutHoldHoursUnverified(String(re.seller.payoutHoldHoursUnverified));
      }
      if (re?.claims) {
        setTicketNotReceivedMinHours(String(re.claims.ticketNotReceived?.minimumClaimHours ?? ''));
        setTicketNotReceivedMaxHours(String(re.claims.ticketNotReceived?.maximumClaimHours ?? ''));
        setTicketDidntWorkMinHours(String(re.claims.ticketDidntWork?.minimumClaimHours ?? ''));
        setTicketDidntWorkMaxHours(String(re.claims.ticketDidntWork?.maximumClaimHours ?? ''));
      }
      if (data.exchangeRates) {
        setUsdToArs(String(data.exchangeRates.usdToArs));
      }
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
    const chatPoll = Number(chatPollIntervalSeconds);
    const chatMax = Number(chatMaxMessages);

    if (
      Number.isNaN(buyer) ||
      Number.isNaN(seller) ||
      Number.isNaN(payment) ||
      Number.isNaN(adminHours) ||
      Number.isNaN(chatPoll) ||
      Number.isNaN(chatMax)
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
    if (chatPoll < MIN_CHAT_POLL_SECONDS || chatPoll > MAX_CHAT_POLL_SECONDS) {
      setError(
        `Chat poll interval must be between ${MIN_CHAT_POLL_SECONDS} and ${MAX_CHAT_POLL_SECONDS} seconds.`
      );
      return;
    }
    if (chatMax < MIN_CHAT_MAX_MESSAGES || chatMax > MAX_CHAT_MAX_MESSAGES) {
      setError(
        `Max chat messages must be between ${MIN_CHAT_MAX_MESSAGES} and ${MAX_CHAT_MAX_MESSAGES}.`
      );
      return;
    }

    const maxAmountMajorNum = Number(unverifiedSellerMaxAmountMajor);
    if (!Number.isNaN(maxAmountMajorNum) && (maxAmountMajorNum < 0 || maxAmountMajorNum > 100000)) {
      setError('Unverified seller max amount must be between 0 and 100000.');
      return;
    }
    const phoneAmountNum = Number(phoneRequiredAmountMajor);
    if (!Number.isNaN(phoneAmountNum) && (phoneAmountNum < 0 || phoneAmountNum > 100000)) {
      setError('Require phone amount must be between 0 and 100000.');
      return;
    }
    const dniAmountNum = Number(dniRequiredAmountMajor);
    if (!Number.isNaN(dniAmountNum) && (dniAmountNum < 0 || dniAmountNum > 100000)) {
      setError('Require DNI amount must be between 0 and 100000.');
      return;
    }
    const usdToArsNum = Number(usdToArs);
    if (!Number.isNaN(usdToArsNum) && (usdToArsNum < 1 || usdToArsNum > 1000000)) {
      setError('USD to ARS rate must be between 1 and 1000000.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload: Parameters<typeof adminService.updatePlatformConfig>[0] = {
        buyerPlatformFeePercentage: buyer,
        sellerPlatformFeePercentage: seller,
        paymentTimeoutMinutes: Math.round(payment),
        adminReviewTimeoutHours: Math.round(adminHours),
        transactionChatPollIntervalSeconds: Math.round(chatPoll),
        transactionChatMaxMessages: Math.round(chatMax),
      };
      const cur = config?.riskEngine;
      payload.riskEngine = {
        buyer: {
          phoneRequiredEventHours: (Math.round(Number(phoneRequiredEventHours)) || cur?.buyer?.phoneRequiredEventHours) ?? 0,
          phoneRequiredAmount: (() => {
            const major = Number(phoneRequiredAmountMajor);
            const amountCents = !Number.isNaN(major)
              ? Math.round(major * 100)
              : (cur?.buyer?.phoneRequiredAmount?.amount ?? 0);
            return { amount: amountCents, currency: phoneRequiredAmountCurrency };
          })(),
          phoneRequiredQtyTickets: (Math.round(Number(phoneRequiredQtyTickets)) || cur?.buyer?.phoneRequiredQtyTickets) ?? 0,
          newAccountDays: (Math.round(Number(newAccountDays)) || cur?.buyer?.newAccountDays) ?? 0,
          dniRequiredEventHours: (Math.round(Number(dniRequiredEventHours)) || cur?.buyer?.dniRequiredEventHours) ?? 0,
          dniRequiredAmount: (() => {
            const major = Number(dniRequiredAmountMajor);
            const amountCents = !Number.isNaN(major)
              ? Math.round(major * 100)
              : (cur?.buyer?.dniRequiredAmount?.amount ?? 0);
            return { amount: amountCents, currency: dniRequiredAmountCurrency };
          })(),
          dniRequiredQtyTickets: (Math.round(Number(dniRequiredQtyTickets)) || cur?.buyer?.dniRequiredQtyTickets) ?? 0,
          dniNewAccountDays: (Math.round(Number(dniNewAccountDays)) || cur?.buyer?.dniNewAccountDays) ?? 0,
        },
        seller: {
          unverifiedSellerMaxSales: (Math.round(Number(unverifiedSellerMaxSales)) || cur?.seller?.unverifiedSellerMaxSales) ?? 0,
          unverifiedSellerMaxAmount: (() => {
            const major = Number(unverifiedSellerMaxAmountMajor);
            const amountCents = !Number.isNaN(major) && major > 0
              ? Math.round(major * 100)
              : (cur?.seller?.unverifiedSellerMaxAmount?.amount ?? 0);
            return { amount: amountCents, currency: unverifiedSellerMaxAmountCurrency };
          })(),
          payoutHoldHoursDefault: (Math.round(Number(payoutHoldHoursDefault)) || cur?.seller?.payoutHoldHoursDefault) ?? 0,
          payoutHoldHoursUnverified: (Math.round(Number(payoutHoldHoursUnverified)) || cur?.seller?.payoutHoldHoursUnverified) ?? 0,
        },
        claims: {
          ticketNotReceived: {
            minimumClaimHours: (Math.round(Number(ticketNotReceivedMinHours)) || cur?.claims?.ticketNotReceived?.minimumClaimHours) ?? 0,
            maximumClaimHours: (Math.round(Number(ticketNotReceivedMaxHours)) || cur?.claims?.ticketNotReceived?.maximumClaimHours) ?? 0,
          },
          ticketDidntWork: {
            minimumClaimHours: (Math.round(Number(ticketDidntWorkMinHours)) || cur?.claims?.ticketDidntWork?.minimumClaimHours) ?? 0,
            maximumClaimHours: (Math.round(Number(ticketDidntWorkMaxHours)) || cur?.claims?.ticketDidntWork?.maximumClaimHours) ?? 0,
          },
        },
      };
      payload.exchangeRates = {
        usdToArs: (Number(usdToArs) || config?.exchangeRates?.usdToArs) ?? 0,
      };
      await adminService.updatePlatformConfig(payload);
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
            <div className="space-y-2">
              <Label htmlFor="chatPollIntervalSeconds">
                {t('admin.platformConfig.transactionChatPollIntervalSeconds')}
              </Label>
              <Input
                id="chatPollIntervalSeconds"
                type="number"
                min={MIN_CHAT_POLL_SECONDS}
                max={MAX_CHAT_POLL_SECONDS}
                value={chatPollIntervalSeconds}
                onChange={(e) => setChatPollIntervalSeconds(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatMaxMessages">
                {t('admin.platformConfig.transactionChatMaxMessages')}
              </Label>
              <Input
                id="chatMaxMessages"
                type="number"
                min={MIN_CHAT_MAX_MESSAGES}
                max={MAX_CHAT_MAX_MESSAGES}
                value={chatMaxMessages}
                onChange={(e) => setChatMaxMessages(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('admin.platformConfig.saving') : t('admin.platformConfig.save')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>{t('admin.platformConfig.riskEngineSectionTitle')}</CardTitle>
          <CardDescription>
            Verification triggers, seller limits, payout hold and claim deadlines. Stored in code defaults; edit via this section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buyer: checkout triggers */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t('admin.platformConfig.riskEngineBuyerTitle')}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneRequiredEventHours">
                  {t('admin.platformConfig.phoneRequiredEventHours')}
                </Label>
                <Input
                  id="phoneRequiredEventHours"
                  type="number"
                  min={1}
                  max={720}
                  value={phoneRequiredEventHours}
                  onChange={(e) => setPhoneRequiredEventHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.platformConfig.phoneRequiredAmountUsd')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="max-w-[140px]"
                    value={phoneRequiredAmountMajor}
                    onChange={(e) => setPhoneRequiredAmountMajor(e.target.value)}
                  />
                  <Select
                    value={phoneRequiredAmountCurrency}
                    onValueChange={(v) => setPhoneRequiredAmountCurrency(v as 'USD' | 'ARS')}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUYER_AMOUNT_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneRequiredQtyTickets">
                  {t('admin.platformConfig.phoneRequiredQtyTickets')}
                </Label>
                <Input
                  id="phoneRequiredQtyTickets"
                  type="number"
                  min={1}
                  max={50}
                  value={phoneRequiredQtyTickets}
                  onChange={(e) => setPhoneRequiredQtyTickets(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newAccountDays">
                  {t('admin.platformConfig.newAccountDays')}
                </Label>
                <Input
                  id="newAccountDays"
                  type="number"
                  min={0}
                  max={365}
                  value={newAccountDays}
                  onChange={(e) => setNewAccountDays(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('admin.platformConfig.riskEngineDniSubtitle')}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dniRequiredEventHours">
                  {t('admin.platformConfig.dniRequiredEventHours')}
                </Label>
                <Input
                  id="dniRequiredEventHours"
                  type="number"
                  min={1}
                  max={720}
                  value={dniRequiredEventHours}
                  onChange={(e) => setDniRequiredEventHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.platformConfig.dniRequiredAmountUsd')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="max-w-[140px]"
                    value={dniRequiredAmountMajor}
                    onChange={(e) => setDniRequiredAmountMajor(e.target.value)}
                  />
                  <Select
                    value={dniRequiredAmountCurrency}
                    onValueChange={(v) => setDniRequiredAmountCurrency(v as 'USD' | 'ARS')}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUYER_AMOUNT_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dniRequiredQtyTickets">
                  {t('admin.platformConfig.dniRequiredQtyTickets')}
                </Label>
                <Input
                  id="dniRequiredQtyTickets"
                  type="number"
                  min={1}
                  max={50}
                  value={dniRequiredQtyTickets}
                  onChange={(e) => setDniRequiredQtyTickets(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dniNewAccountDays">
                  {t('admin.platformConfig.dniNewAccountDays')}
                </Label>
                <Input
                  id="dniNewAccountDays"
                  type="number"
                  min={0}
                  max={365}
                  value={dniNewAccountDays}
                  onChange={(e) => setDniNewAccountDays(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seller: limits & payout */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t('admin.platformConfig.riskEngineSellerTitle')}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unverifiedSellerMaxSales">
                  {t('admin.platformConfig.unverifiedSellerMaxSales')}
                </Label>
                <Input
                  id="unverifiedSellerMaxSales"
                  type="number"
                  min={0}
                  max={100}
                  value={unverifiedSellerMaxSales}
                  onChange={(e) => setUnverifiedSellerMaxSales(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.platformConfig.unverifiedSellerMaxAmount')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    value={unverifiedSellerMaxAmountMajor}
                    onChange={(e) => setUnverifiedSellerMaxAmountMajor(e.target.value)}
                    placeholder="200"
                  />
                  <Select
                    value={unverifiedSellerMaxAmountCurrency}
                    onValueChange={(v) => setUnverifiedSellerMaxAmountCurrency(v as CurrencyCode)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payoutHoldHoursDefault">
                  {t('admin.platformConfig.payoutHoldHoursDefault')}
                </Label>
                <Input
                  id="payoutHoldHoursDefault"
                  type="number"
                  min={0}
                  max={168}
                  value={payoutHoldHoursDefault}
                  onChange={(e) => setPayoutHoldHoursDefault(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payoutHoldHoursUnverified">
                  {t('admin.platformConfig.payoutHoldHoursUnverified')}
                </Label>
                <Input
                  id="payoutHoldHoursUnverified"
                  type="number"
                  min={0}
                  max={168}
                  value={payoutHoldHoursUnverified}
                  onChange={(e) => setPayoutHoldHoursUnverified(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Claims & disputes */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t('admin.platformConfig.riskEngineClaimsTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t('admin.platformConfig.claimsTicketNotReceived')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticketNotReceivedMinHours">
                      {t('admin.platformConfig.minimumClaimHours')}
                    </Label>
                    <Input
                      id="ticketNotReceivedMinHours"
                      type="number"
                      min={0}
                      max={720}
                      value={ticketNotReceivedMinHours}
                      onChange={(e) => setTicketNotReceivedMinHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketNotReceivedMaxHours">
                      {t('admin.platformConfig.maximumClaimHours')}
                    </Label>
                    <Input
                      id="ticketNotReceivedMaxHours"
                      type="number"
                      min={1}
                      max={720}
                      value={ticketNotReceivedMaxHours}
                      onChange={(e) => setTicketNotReceivedMaxHours(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t('admin.platformConfig.claimsTicketDidntWork')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticketDidntWorkMinHours">
                      {t('admin.platformConfig.minimumClaimHours')}
                    </Label>
                    <Input
                      id="ticketDidntWorkMinHours"
                      type="number"
                      min={0}
                      max={720}
                      value={ticketDidntWorkMinHours}
                      onChange={(e) => setTicketDidntWorkMinHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketDidntWorkMaxHours">
                      {t('admin.platformConfig.maximumClaimHours')}
                    </Label>
                    <Input
                      id="ticketDidntWorkMaxHours"
                      type="number"
                      min={1}
                      max={720}
                      value={ticketDidntWorkMaxHours}
                      onChange={(e) => setTicketDidntWorkMaxHours(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium">
              {t('admin.platformConfig.exchangeRatesSectionTitle')}
            </Label>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {t('admin.platformConfig.usdToArs')}
              </span>
              <Input
                type="number"
                min={1}
                max={1000000}
                className="w-32"
                value={usdToArs}
                onChange={(e) => setUsdToArs(e.target.value)}
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
