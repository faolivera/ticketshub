import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Ticket,
  MessageSquare,
  Shield,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { adminService } from '@/api/services/admin.service';
import type { AdminDashboardMetricsResponse } from '@/api/types/admin';

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="font-semibold tabular-nums shrink-0">{value}</span>
    </div>
  );
}

function MetricSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; value: number }[];
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {title}
      </h2>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <div className="divide-y divide-border/60">
          {items.map((item, i) => (
            <MetricRow key={i} label={item.label} value={item.value} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PendingLink({
  to,
  label,
  count,
}: {
  to: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
    >
      <span className="text-xs font-medium">{label}</span>
      <span className="flex items-center gap-1 shrink-0">
        <span className="text-sm font-semibold tabular-nums">{count}</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </span>
    </Link>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<AdminDashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getDashboardMetrics()
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load metrics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('admin.dashboard.title')}</h1>
        <p className="text-destructive">{error ?? 'No metrics data'}</p>
      </div>
    );
  }

  const { users: u, events: e, supportTickets: st, pending: p } = metrics;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
        <h1 className="text-xl font-semibold">{t('admin.dashboard.title')}</h1>
        <p className="text-xs text-muted-foreground">{t('admin.dashboard.subtitle')}</p>
      </div>

      {/* Pending (with links) - first for quick access */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t('admin.dashboard.sectionPending')}</h2>
          <span className="text-xs text-muted-foreground">— {t('admin.dashboard.pendingDescription')}</span>
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <PendingLink
            to="/admin/identity-verifications"
            label={t('admin.dashboard.pendingIdentity')}
            count={p.identityVerifications}
          />
          <PendingLink
            to="/admin/identity-verifications?tab=bank"
            label={t('admin.dashboard.pendingBankAccounts')}
            count={p.bankAccounts}
          />
          <PendingLink
            to="/admin/events"
            label={t('admin.dashboard.pendingEventsApproval')}
            count={p.eventsAwaitingApproval}
          />
          <PendingLink
            to="/admin/transactions"
            label={t('admin.dashboard.pendingBuyerPayments')}
            count={p.buyerPaymentsPending}
          />
          <PendingLink
            to="/admin/seller-payouts"
            label={t('admin.dashboard.pendingSellerPayouts')}
            count={p.sellerPayoutsPending}
          />
        </div>
      </section>

      {/* Users · Events · Support — separate sections, compact list style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricSection
          title={t('admin.dashboard.sectionUsers')}
          icon={Users}
          items={[
            { label: t('admin.dashboard.usersTotal'), value: u.total },
            { label: t('admin.dashboard.usersPhoneVerified'), value: u.phoneVerified },
            { label: t('admin.dashboard.usersDniVerified'), value: u.dniVerified },
            { label: t('admin.dashboard.usersSellers'), value: u.sellers },
            { label: t('admin.dashboard.usersVerifiedSellers'), value: u.verifiedSellers },
          ]}
        />
        <MetricSection
          title={t('admin.dashboard.sectionEvents')}
          icon={Calendar}
          items={[
            { label: t('admin.dashboard.eventsPublished'), value: e.totalPublished },
            { label: t('admin.dashboard.eventsActive'), value: e.totalActive },
            { label: t('admin.dashboard.eventsToday'), value: e.eventsToday },
            { label: t('admin.dashboard.eventsAwaitingApproval'), value: e.awaitingApproval },
          ]}
        />
        <MetricSection
          title={t('admin.dashboard.sectionSupportTickets')}
          icon={MessageSquare}
          items={[
            { label: t('admin.dashboard.stOpen'), value: st.totalOpen },
            { label: t('admin.dashboard.stInProgress'), value: st.totalInProgress },
            { label: t('admin.dashboard.stResolved'), value: st.totalResolved },
            { label: t('admin.dashboard.stTotal'), value: st.total },
          ]}
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
