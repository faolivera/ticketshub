import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Loader2, ChevronDown, ChevronRight, Clock, User, Zap, MessageCircle } from 'lucide-react';
import { adminService } from '@/api/services';
import { formatDateTimeMedium } from '@/lib/format-date';
import type { AdminTransactionAuditLogEntry, AdminTransactionChatMessageItem, AdminTransactionDetailResponse } from '@/api/types/admin';

interface TransactionAuditLogsDialogProps {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function shortenId(id: string): string {
  if (id.length <= 13) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const STATUS_COLORS: Record<string, string> = {
  PendingPayment:             'bg-yellow-50 text-yellow-700 border-yellow-200',
  PaymentPendingVerification: 'bg-blue-50 text-blue-700 border-blue-200',
  PaymentReceived:            'bg-green-50 text-green-700 border-green-200',
  Completed:                  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled:                  'bg-red-50 text-red-700 border-red-200',
  Refunded:                   'bg-orange-50 text-orange-700 border-orange-200',
};

function StatusChip({ value }: { value: string }) {
  const cls = STATUS_COLORS[value] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {value}
    </span>
  );
}

function RenderValue({ valueKey, value }: { valueKey: string; value: unknown }) {
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');

  if (valueKey === 'status' && typeof value === 'string') {
    return <StatusChip value={value} />;
  }

  if (typeof value === 'string' && value.length > 20 && /^[a-z0-9_-]+$/i.test(value)) {
    return (
      <span
        className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded cursor-default"
        title={value}
      >
        {shortenId(value)}
      </span>
    );
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return (
      <span className="text-xs text-muted-foreground">
        {new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    );
  }

  return <span className="text-xs font-medium">{str}</span>;
}

// ─── Payload chips ───────────────────────────────────────────────────────────

function PayloadChips({ payload }: { payload: unknown }) {
  const { t } = useTranslation();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return <span className="text-xs text-muted-foreground">{t('admin.transactions.auditPayloadNoDetails')}</span>;
  }
  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('admin.transactions.auditPayloadNoDetails')}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-xs"
        >
          <span className="text-muted-foreground">{humanizeKey(key)}</span>
          <span className="text-border">·</span>
          <RenderValue valueKey={key} value={value} />
        </span>
      ))}
    </div>
  );
}

// ─── JSON Viewer ─────────────────────────────────────────────────────────────

function JsonViewer({ payload }: { payload: unknown }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {t('admin.transactions.auditViewPayload')}
      </button>
      {open && (
        <pre className="mt-2 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all rounded-lg bg-muted/50 border p-3 text-foreground/80">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Action badge ─────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const { t } = useTranslation();

  const label =
    action === 'created'
      ? t('admin.transactions.auditActionCreated')
      : action === 'updated'
        ? t('admin.transactions.auditActionUpdated')
        : action;

  const cls =
    action === 'created'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : action === 'updated'
        ? 'bg-violet-50 text-violet-700 border-violet-200'
        : 'bg-muted text-muted-foreground border-border';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Zap className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ─── Log Entry card ───────────────────────────────────────────────────────────

function LogEntry({ log, isLast }: { log: AdminTransactionAuditLogEntry; isLast: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border/60" />
      )}

      <div className="relative z-10 flex-none mt-1">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
            ${log.action === 'created'
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-violet-50 border-violet-300'
            }`}
        >
          <Zap
            className={`w-3.5 h-3.5 ${
              log.action === 'created' ? 'text-emerald-600' : 'text-violet-600'
            }`}
          />
        </div>
      </div>

      <div className="flex-1 mb-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <ActionBadge action={log.action} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span className="font-mono" title={log.changedBy}>
                {shortenId(log.changedBy)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {formatDateTimeMedium(log.changedAt)}
          </div>
        </div>

        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            {t('admin.transactions.auditPayloadTitle', 'Cambios')}
          </p>
          <PayloadChips payload={log.payload} />
          <JsonViewer payload={log.payload} />
        </div>
      </div>
    </div>
  );
}

// ─── Chat message bubble ──────────────────────────────────────────────────────

function ChatBubble({
  msg,
  buyerName,
  sellerName,
}: {
  msg: AdminTransactionChatMessageItem;
  buyerName: string;
  sellerName: string;
}) {
  const { t } = useTranslation();
  const isBuyer = msg.senderRole === 'buyer';
  const name = isBuyer ? buyerName : sellerName;
  const roleLabel = isBuyer ? t('admin.transactions.chatBuyer') : t('admin.transactions.chatSeller');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 px-1">
        <span
          className={`text-xs font-semibold ${
            isBuyer ? 'text-blue-600' : 'text-violet-600'
          }`}
        >
          {name}
        </span>
        <span className="text-[10px] text-muted-foreground">({roleLabel})</span>
        <span className="text-[10px] text-muted-foreground">
          · {new Date(msg.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
      <div
        className={`px-3 py-2 rounded-xl text-sm leading-relaxed break-words border ${
          isBuyer
            ? 'bg-blue-50 border-blue-100 text-blue-900'
            : 'bg-violet-50 border-violet-100 text-violet-900'
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function TransactionAuditLogsDialog({
  open,
  transactionId,
  onClose,
}: TransactionAuditLogsDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'audit' | 'chat'>('audit');

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<AdminTransactionAuditLogEntry[]>([]);

  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AdminTransactionChatMessageItem[]>([]);
  const [transactionDetail, setTransactionDetail] = useState<AdminTransactionDetailResponse | null>(null);

  useEffect(() => {
    if (!open || !transactionId) return;
    setAuditLoading(true);
    setAuditError(null);
    setAuditItems([]);
    adminService
      .getTransactionAuditLogs(transactionId, 'desc')
      .then((response) => setAuditItems(Array.isArray(response.items) ? response.items : []))
      .catch((err) => setAuditError(err instanceof Error ? err.message : t('common.errorLoading')))
      .finally(() => setAuditLoading(false));
  }, [open, transactionId, t]);

  useEffect(() => {
    if (!open || !transactionId) return;
    setChatLoading(true);
    setChatError(null);
    setChatMessages([]);
    setTransactionDetail(null);
    Promise.all([
      adminService.getTransactionChatMessages(transactionId),
      adminService.getTransactionById(transactionId),
    ])
      .then(([chatResponse, detail]) => {
        setChatMessages(Array.isArray(chatResponse.messages) ? chatResponse.messages : []);
        setTransactionDetail(detail);
      })
      .catch((err) => setChatError(err instanceof Error ? err.message : t('common.errorLoading')))
      .finally(() => setChatLoading(false));
  }, [open, transactionId, t]);

  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            {t('admin.transactions.auditLogsTitle')}
          </DialogTitle>
          {transactionId && (
            <DialogDescription asChild>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {transactionId}
                </span>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b gap-0 -mx-1 px-1">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {t('admin.transactions.tabAuditLogs')}
            {!auditLoading && !auditError && (
              <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {auditItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {t('admin.transactions.tabChat')}
            {!chatLoading && !chatError && (
              <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab: Audit logs */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-auto min-h-[300px] pr-1 pt-2">
            {auditLoading ? (
              <div className="flex items-center justify-center h-[280px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : auditError ? (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {auditError}
              </div>
            ) : auditItems.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                {t('admin.transactions.auditLogsEmpty')}
              </div>
            ) : (
              <div className="pl-1 pr-1">
                {auditItems.map((log, idx) => (
                  <LogEntry key={log.id} log={log} isLast={idx === auditItems.length - 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-auto min-h-[300px] pt-3 px-2">
            {chatLoading ? (
              <div className="flex items-center justify-center h-[280px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : chatError ? (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {chatError}
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                {t('admin.transactions.chatEmpty')}
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-2">
                {chatMessages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    msg={msg}
                    buyerName={transactionDetail?.buyer?.name ?? shortenId(msg.senderId)}
                    sellerName={transactionDetail?.seller?.name ?? shortenId(msg.senderId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
