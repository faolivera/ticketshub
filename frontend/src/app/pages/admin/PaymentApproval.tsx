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
import { Badge } from '../../components/ui/badge';
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
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { CreditCard, Check, X, BanknoteIcon, User, FileText, Image, Eye, ExternalLink } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { paymentConfirmationsService } from '../../../api/services';
import type { PaymentConfirmationWithTransaction } from '../../../api/types';

export function PaymentApproval() {
  const { t } = useTranslation();
  const { token } = useUser();
  const [confirmations, setConfirmations] = useState<PaymentConfirmationWithTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfirmation, setSelectedConfirmation] = useState<PaymentConfirmationWithTransaction | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPendingConfirmations = async () => {
    try {
      setLoading(true);
      const data = await paymentConfirmationsService.listPendingConfirmations();
      setConfirmations(data.confirmations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingConfirmations();
  }, [token]);

  const handleApprove = async (confirmationId: string) => {
    try {
      setProcessing(confirmationId);
      
      await paymentConfirmationsService.updateStatus(confirmationId, 'Accepted');
      
      await fetchPendingConfirmations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedConfirmation) return;
    try {
      setProcessing(selectedConfirmation.id);
      
      await paymentConfirmationsService.updateStatus(
        selectedConfirmation.id, 
        'Rejected', 
        rejectionReason
      );
      
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedConfirmation(null);
      await fetchPendingConfirmations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (confirmation: PaymentConfirmationWithTransaction) => {
    setSelectedConfirmation(confirmation);
    setIsRejectDialogOpen(true);
  };

  const openPreviewDialog = async (confirmation: PaymentConfirmationWithTransaction) => {
    setSelectedConfirmation(confirmation);
    setIsPreviewDialogOpen(true);
    setPreviewLoading(true);
    setPreviewBlobUrl(null);
    
    try {
      const blobUrl = await paymentConfirmationsService.getFileBlobUrl(confirmation.transactionId);
      setPreviewBlobUrl(blobUrl);
    } catch (err) {
      console.error('Failed to load file preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewDialog = () => {
    setIsPreviewDialogOpen(false);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.includes('pdf')) {
      return <FileText className="w-4 h-4" />;
    }
    return <Image className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.payments.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.payments.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('admin.payments.pendingApproval')}
          </CardTitle>
          <CardDescription>
            {t('admin.payments.pendingDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : confirmations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BanknoteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              {t('admin.payments.noPayments')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.payments.event')}</TableHead>
                  <TableHead>{t('admin.payments.buyer')}</TableHead>
                  <TableHead>{t('admin.payments.seller')}</TableHead>
                  <TableHead>{t('admin.payments.amount')}</TableHead>
                  <TableHead>{t('admin.payments.confirmation')}</TableHead>
                  <TableHead>{t('admin.payments.uploadedAt')}</TableHead>
                  <TableHead className="text-right">{t('admin.payments.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmations.map((confirmation) => (
                  <TableRow key={confirmation.id}>
                    <TableCell className="font-medium">
                      {confirmation.eventName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {confirmation.buyerName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {confirmation.sellerName}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatAmount(confirmation.transactionAmount, confirmation.transactionCurrency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(confirmation.contentType)}
                        <span className="text-sm truncate max-w-[120px]" title={confirmation.originalFilename}>
                          {confirmation.originalFilename}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => openPreviewDialog(confirmation)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(confirmation.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(confirmation.id)}
                          disabled={processing === confirmation.id}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {t('admin.payments.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openRejectDialog(confirmation)}
                          disabled={processing === confirmation.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          {t('admin.payments.reject')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => { if (!open) closePreviewDialog(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConfirmation && getFileIcon(selectedConfirmation.contentType)}
              {t('admin.payments.viewConfirmation')}
            </DialogTitle>
            <DialogDescription>
              {selectedConfirmation?.originalFilename}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[400px]">
            {selectedConfirmation && (
              <>
                <div className="bg-muted p-3 rounded-lg mb-4 space-y-1">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('admin.payments.event')}:</span>
                      <span className="ml-2 font-medium">{selectedConfirmation.eventName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin.payments.amount')}:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {formatAmount(selectedConfirmation.transactionAmount, selectedConfirmation.transactionCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin.payments.buyer')}:</span>
                      <span className="ml-2">{selectedConfirmation.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('admin.payments.seller')}:</span>
                      <span className="ml-2">{selectedConfirmation.sellerName}</span>
                    </div>
                  </div>
                </div>
                
                {previewLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : previewBlobUrl ? (
                  selectedConfirmation.contentType.includes('pdf') ? (
                    <iframe
                      src={previewBlobUrl}
                      className="w-full h-[500px] border rounded"
                      title={t('admin.payments.paymentConfirmation')}
                    />
                  ) : (
                    <div className="flex items-center justify-center bg-gray-100 rounded p-4">
                      <img
                        src={previewBlobUrl}
                        alt={t('admin.payments.paymentConfirmation')}
                        className="max-w-full max-h-[500px] object-contain"
                      />
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    {t('common.errorLoading')}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={closePreviewDialog}>
              {t('common.close')}
            </Button>
            {selectedConfirmation && (
              <>
                {previewBlobUrl && (
                  <a
                    href={previewBlobUrl}
                    download={selectedConfirmation.originalFilename}
                    className="inline-flex"
                  >
                    <Button variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('admin.payments.download')}
                    </Button>
                  </a>
                )}
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleApprove(selectedConfirmation.id);
                    closePreviewDialog();
                  }}
                  disabled={processing === selectedConfirmation.id}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('admin.payments.approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    closePreviewDialog();
                    openRejectDialog(selectedConfirmation);
                  }}
                  disabled={processing === selectedConfirmation.id}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('admin.payments.reject')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.payments.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.payments.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedConfirmation && (
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <p className="font-medium">{selectedConfirmation.eventName}</p>
                <p className="text-sm text-muted-foreground">
                  {t('admin.payments.buyer')}: {selectedConfirmation.buyerName}
                </p>
                <p className="text-sm font-semibold text-green-600">
                  {formatAmount(selectedConfirmation.transactionAmount, selectedConfirmation.transactionCurrency)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">{t('admin.payments.rejectionReason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('admin.payments.rejectionReasonPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing !== null}
            >
              {t('admin.payments.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PaymentApproval;
