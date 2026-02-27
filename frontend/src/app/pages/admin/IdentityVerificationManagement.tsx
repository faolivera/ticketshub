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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Shield, Check, X, User, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { identityVerificationService } from '@/api/services';
import type {
  IdentityVerificationWithUser,
  IdentityVerificationStatus,
} from '@/api/types/identity-verification';

export function IdentityVerificationManagement() {
  const { t } = useTranslation();
  const [verifications, setVerifications] = useState<IdentityVerificationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IdentityVerificationStatus | 'all'>('all');

  const [selectedVerification, setSelectedVerification] = useState<IdentityVerificationWithUser | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const data = await identityVerificationService.listVerifications(filter);
      setVerifications(data.verifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter]);

  const handleApprove = async (verificationId: string) => {
    try {
      setProcessing(verificationId);
      await identityVerificationService.updateStatus(verificationId, 'approved');
      await fetchVerifications();
      if (isPreviewDialogOpen) closePreviewDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    try {
      setProcessing(selectedVerification.id);
      await identityVerificationService.updateStatus(
        selectedVerification.id,
        'rejected',
        rejectionReason,
      );
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedVerification(null);
      await fetchVerifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (verification: IdentityVerificationWithUser) => {
    setSelectedVerification(verification);
    setIsRejectDialogOpen(true);
  };

  const openPreviewDialog = async (verification: IdentityVerificationWithUser) => {
    setSelectedVerification(verification);
    setIsPreviewDialogOpen(true);
    setImagesLoading(true);
    setFrontImageUrl(null);
    setBackImageUrl(null);

    try {
      const [frontUrl, backUrl] = await Promise.all([
        identityVerificationService.getDocumentBlobUrl(verification.id, 'front'),
        identityVerificationService.getDocumentBlobUrl(verification.id, 'back'),
      ]);
      setFrontImageUrl(frontUrl);
      setBackImageUrl(backUrl);
    } catch (err) {
      console.error('Failed to load document images:', err);
    } finally {
      setImagesLoading(false);
    }
  };

  const closePreviewDialog = () => {
    setIsPreviewDialogOpen(false);
    if (frontImageUrl) {
      URL.revokeObjectURL(frontImageUrl);
      setFrontImageUrl(null);
    }
    if (backImageUrl) {
      URL.revokeObjectURL(backImageUrl);
      setBackImageUrl(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: IdentityVerificationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
            <Clock className="w-3 h-3 mr-1" />
            {t('admin.identityVerification.statusPending')}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('admin.identityVerification.statusApproved')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
            <XCircle className="w-3 h-3 mr-1" />
            {t('admin.identityVerification.statusRejected')}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.identityVerification.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.identityVerification.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('admin.identityVerification.verificationRequests')}
              </CardTitle>
              <CardDescription>
                {t('admin.identityVerification.description')}
              </CardDescription>
            </div>
            <div className="w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as IdentityVerificationStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.identityVerification.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.identityVerification.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('admin.identityVerification.statusPending')}</SelectItem>
                  <SelectItem value="approved">{t('admin.identityVerification.statusApproved')}</SelectItem>
                  <SelectItem value="rejected">{t('admin.identityVerification.statusRejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              {t('admin.identityVerification.noVerifications')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.identityVerification.user')}</TableHead>
                  <TableHead>{t('admin.identityVerification.legalName')}</TableHead>
                  <TableHead>{t('admin.identityVerification.dateOfBirth')}</TableHead>
                  <TableHead>{t('admin.identityVerification.govId')}</TableHead>
                  <TableHead>{t('admin.identityVerification.status')}</TableHead>
                  <TableHead>{t('admin.identityVerification.submittedAt')}</TableHead>
                  <TableHead className="text-right">{t('admin.identityVerification.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{verification.userPublicName}</p>
                          <p className="text-sm text-muted-foreground">{verification.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {verification.legalFirstName} {verification.legalLastName}
                    </TableCell>
                    <TableCell>{verification.dateOfBirth}</TableCell>
                    <TableCell>
                      <span className="font-mono">
                        ••••{verification.governmentIdNumber.slice(-4)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(verification.status)}</TableCell>
                    <TableCell>{formatDate(verification.submittedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreviewDialog(verification)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {t('admin.identityVerification.view')}
                        </Button>
                        {verification.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(verification.id)}
                              disabled={processing === verification.id}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              {t('admin.identityVerification.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openRejectDialog(verification)}
                              disabled={processing === verification.id}
                            >
                              <X className="w-4 h-4 mr-1" />
                              {t('admin.identityVerification.reject')}
                            </Button>
                          </>
                        )}
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
              <Shield className="w-5 h-5" />
              {t('admin.identityVerification.verificationDetails')}
            </DialogTitle>
            <DialogDescription>
              {selectedVerification?.userPublicName} ({selectedVerification?.userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedVerification && (
              <>
                <div className="bg-muted p-4 rounded-lg mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.identityVerification.legalName')}</p>
                    <p className="font-medium">
                      {selectedVerification.legalFirstName} {selectedVerification.legalLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.identityVerification.dateOfBirth')}</p>
                    <p className="font-medium">{selectedVerification.dateOfBirth}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.identityVerification.govId')}</p>
                    <p className="font-medium font-mono">{selectedVerification.governmentIdNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.identityVerification.status')}</p>
                    <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                  </div>
                  {selectedVerification.adminNotes && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">{t('admin.identityVerification.adminNotes')}</p>
                      <p className="font-medium text-red-600">{selectedVerification.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('admin.identityVerification.documentFront')}</h4>
                    {imagesLoading ? (
                      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : frontImageUrl ? (
                      <img
                        src={frontImageUrl}
                        alt="Front of ID"
                        className="w-full h-auto max-h-64 object-contain border rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg text-muted-foreground">
                        {t('common.errorLoading')}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{t('admin.identityVerification.documentBack')}</h4>
                    {imagesLoading ? (
                      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : backImageUrl ? (
                      <img
                        src={backImageUrl}
                        alt="Back of ID"
                        className="w-full h-auto max-h-64 object-contain border rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg text-muted-foreground">
                        {t('common.errorLoading')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={closePreviewDialog}>
              {t('common.close')}
            </Button>
            {selectedVerification?.status === 'pending' && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedVerification.id)}
                  disabled={processing === selectedVerification.id}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('admin.identityVerification.approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    closePreviewDialog();
                    openRejectDialog(selectedVerification);
                  }}
                  disabled={processing === selectedVerification.id}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('admin.identityVerification.reject')}
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
            <DialogTitle>{t('admin.identityVerification.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.identityVerification.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedVerification && (
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <p className="font-medium">
                  {selectedVerification.legalFirstName} {selectedVerification.legalLastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedVerification.userEmail}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">{t('admin.identityVerification.rejectionReason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('admin.identityVerification.rejectionReasonPlaceholder')}
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
              {t('admin.identityVerification.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IdentityVerificationManagement;
