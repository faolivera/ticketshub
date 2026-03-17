import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Banknote, Loader2, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { adminService } from '../../../api/services';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import type {
  AdminSellerPayoutItem,
  AdminSellerPayoutTicketLine,
} from '../../../api/types/admin';

function formatTicketLine(
  line: AdminSellerPayoutTicketLine,
  formatCurrencyFn: (amount: number, currency: string) => string,
  t: (key: string) => string,
): string {
  const price = formatCurrencyFn(line.unitPrice.amount, line.unitPrice.currency);
  const seats = line.seatLabels?.length
    ? `: ${line.seatLabels.join(' Y ')}`
    : '';
  return `${line.quantity} ${t('admin.sellerPayouts.entradas')} ${line.sectionName}${seats} (${price} ${t('admin.sellerPayouts.perUnit')})`;
}

export function SellerPayouts() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payouts, setPayouts] = useState<AdminSellerPayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [payoutToComplete, setPayoutToComplete] = useState<AdminSellerPayoutItem | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [showUnverifiedConfirm, setShowUnverifiedConfirm] = useState(false);

  const fetchPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getSellerPayouts();
      setPayouts(data.payouts);
    } catch {
      setError(t('admin.sellerPayouts.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const openCompleteModal = (payout: AdminSellerPayoutItem) => {
    setPayoutToComplete(payout);
    setReceiptFiles([]);
    setError(null);
  };

  const closeCompleteModal = () => {
    setPayoutToComplete(null);
    setReceiptFiles([]);
    setShowUnverifiedConfirm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setReceiptFiles((prev) => [...prev, ...files]);
  };

  const removeReceiptFile = (index: number) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const doCompletePayout = async () => {
    if (!payoutToComplete) return;
    const transactionId = payoutToComplete.transactionId;
    try {
      setCompletingId(transactionId);
      await adminService.completePayout(
        transactionId,
        receiptFiles.length ? receiptFiles : undefined,
      );
      setPayouts((prev) => prev.filter((p) => p.transactionId !== transactionId));
      closeCompleteModal();
      setShowUnverifiedConfirm(false);
    } catch {
      setError(t('admin.sellerPayouts.errorComplete'));
    } finally {
      setCompletingId(null);
    }
  };

  const handleSubmitComplete = () => {
    if (!payoutToComplete) return;
    if (!payoutToComplete.sellerVerified) {
      setShowUnverifiedConfirm(true);
      return;
    }
    doCompletePayout();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          {t('admin.sellerPayouts.title')}
        </CardTitle>
        <CardDescription>{t('admin.sellerPayouts.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        {payouts.length === 0 ? (
          <p className="text-muted-foreground">{t('admin.sellerPayouts.noPayouts')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.sellerPayouts.transactionId')}</TableHead>
                <TableHead>{t('admin.sellerPayouts.eventName')}</TableHead>
                <TableHead>{t('admin.sellerPayouts.eventDate')}</TableHead>
                <TableHead>{t('admin.sellerPayouts.seller')}</TableHead>
                <TableHead className="w-[100px]">{t('admin.sellerPayouts.sellerVerified')}</TableHead>
                <TableHead>{t('admin.sellerPayouts.amount')}</TableHead>
                <TableHead>{t('admin.sellerPayouts.entradasColumn')}</TableHead>
                <TableHead>{t('admin.sellerPayouts.bankDetails')}</TableHead>
                <TableHead className="w-[120px]">{''}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.transactionId}>
                  <TableCell className="font-mono text-xs">{payout.transactionId}</TableCell>
                  <TableCell>{payout.eventName}</TableCell>
                  <TableCell>{formatDate(payout.eventDate)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payout.sellerName}</div>
                      <div className="text-xs text-muted-foreground">{payout.sellerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payout.sellerVerified ? (
                      <Badge variant="secondary" className="gap-1 font-normal">
                        <CheckCircle className="h-3.5 w-3" />
                        {t('admin.sellerPayouts.verified')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 font-normal text-amber-700 border-amber-300 bg-amber-50">
                        <AlertCircle className="h-3.5 w-3" />
                        {t('admin.sellerPayouts.notVerified')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(payout.sellerReceives.amount, payout.sellerReceives.currency)}
                  </TableCell>
                  <TableCell className="text-sm max-w-[280px]">
                    {formatTicketLine(payout.ticketLine, formatCurrency, t)}
                  </TableCell>
                  <TableCell>
                    {payout.bankTransferDestination ? (
                      <div className="text-sm">
                        <div>{payout.bankTransferDestination.holderName}</div>
                        <div className="font-mono text-xs">{payout.bankTransferDestination.cbuOrCvu}</div>
                        {payout.bankTransferDestination.alias && (
                          <div className="text-muted-foreground text-xs">{payout.bankTransferDestination.alias}</div>
                        )}
                        {payout.bankTransferDestination.bankName && (
                          <div className="text-muted-foreground">{payout.bankTransferDestination.bankName}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => openCompleteModal(payout)}
                      disabled={completingId !== null}
                    >
                      {t('admin.sellerPayouts.markAsPaid')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!payoutToComplete} onOpenChange={(open) => !open && closeCompleteModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.sellerPayouts.completeModalTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.sellerPayouts.completeModalDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('admin.sellerPayouts.uploadReceipts')}
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('admin.sellerPayouts.uploadReceiptsHint')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('admin.sellerPayouts.uploadReceipts')}
              </Button>
              {receiptFiles.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  <span className="text-muted-foreground">{t('admin.sellerPayouts.selectedFiles')}:</span>
                  {receiptFiles.map((file, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeReceiptFile(i)}
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCompleteModal} disabled={!!completingId}>
              {t('admin.sellerPayouts.cancel')}
            </Button>
            <Button
              onClick={handleSubmitComplete}
              disabled={!!completingId}
            >
              {completingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('admin.sellerPayouts.submitComplete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnverifiedConfirm} onOpenChange={setShowUnverifiedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.sellerPayouts.unverifiedConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.sellerPayouts.unverifiedConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.sellerPayouts.unverifiedConfirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={doCompletePayout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('admin.sellerPayouts.unverifiedConfirmYes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default SellerPayouts;
