import { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Users, Search, Pencil, Loader2 } from 'lucide-react';
import { adminService } from '@/api/services/admin.service';
import { formatDateShort } from '@/lib/format-date';
import type {
  AdminUserListItem,
  AdminUserDetailResponse,
  AdminUpdateUserRequest,
} from '@/api/types/admin';

const PAGE_SIZE = 20;

export function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUserDetailResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AdminUpdateUserRequest>({});

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getUsers({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const buildEditFormFromDetail = (detail: AdminUserDetailResponse): AdminUpdateUserRequest => ({
    firstName: detail.firstName,
    lastName: detail.lastName,
    publicName: detail.publicName,
    email: detail.email,
    role: detail.role,
    status: detail.status,
    phone: detail.phone ?? '',
    emailVerified: detail.emailVerified,
    phoneVerified: detail.phoneVerified,
    country: detail.country,
    currency: detail.currency,
    language: detail.language,
    tosAcceptedAt: detail.tosAcceptedAt ?? null,
    acceptedSellerTermsAt: detail.acceptedSellerTermsAt ?? null,
    buyerDisputed: detail.buyerDisputed,
    identityVerification: detail.identityVerification
      ? {
          status: detail.identityVerification.status,
          rejectionReason: detail.identityVerification.rejectionReason ?? '',
          reviewedAt: detail.identityVerification.reviewedAt ?? null,
        }
      : undefined,
    bankAccount: detail.bankAccount
      ? {
          holderName: detail.bankAccount.holderName,
          cbuOrCvu: detail.bankAccount.cbuOrCvu,
          verified: detail.bankAccount.verified,
          verifiedAt: detail.bankAccount.verifiedAt ?? null,
        }
      : undefined,
  });

  const openModal = async (userId: string) => {
    setSelectedUser(null);
    setEditForm({});
    setModalError(null);
    setModalLoading(true);
    try {
      const detail = await adminService.getUserById(userId);
      setSelectedUser(detail);
      setEditForm(buildEditFormFromDetail(detail));
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setEditForm({});
    setModalError(null);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      setModalSaving(true);
      setModalError(null);
      const payload: AdminUpdateUserRequest = { ...editForm };
      if (payload.tosAcceptedAt === '') (payload as Record<string, unknown>).tosAcceptedAt = null;
      if (payload.acceptedSellerTermsAt === '') (payload as Record<string, unknown>).acceptedSellerTermsAt = null;
      if (payload.identityVerification?.reviewedAt === '') {
        payload.identityVerification = { ...payload.identityVerification, reviewedAt: null };
      }
      if (payload.bankAccount?.verifiedAt === '') {
        payload.bankAccount = { ...payload.bankAccount, verifiedAt: null };
      }
      await adminService.updateUser(selectedUser.id, payload);
      const updated = await adminService.getUserById(selectedUser.id);
      setSelectedUser(updated);
      setEditForm(buildEditFormFromDetail(updated));
      await fetchUsers();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setModalSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.users.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.users.description')}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('admin.users.listTitle')}
          </CardTitle>
          <CardDescription>{t('admin.users.listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.users.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">{t('admin.users.search')}</Button>
          </form>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.users.name')}</TableHead>
                      <TableHead>{t('admin.users.email')}</TableHead>
                      <TableHead>{t('admin.users.status')}</TableHead>
                      <TableHead>{t('admin.users.role')}</TableHead>
                      <TableHead>{t('admin.users.verifications')}</TableHead>
                      <TableHead>{t('admin.users.sellerSince')}</TableHead>
                      <TableHead>{t('admin.users.createdAt')}</TableHead>
                      <TableHead className="w-[100px]">{t('admin.users.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {search ? t('admin.users.noResults') : t('admin.users.empty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.firstName} {u.lastName}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.status === 'Enabled' ? 'default' : 'secondary'}>
                              {t(`admin.users.statusValue.${u.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>{t(`admin.users.roleValue.${u.role}`)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.emailVerified && (
                                <Badge variant="outline" className="text-xs">{t('admin.users.emailVerified')}</Badge>
                              )}
                              {u.phoneVerified && (
                                <Badge variant="outline" className="text-xs">{t('admin.users.phoneVerified')}</Badge>
                              )}
                              {u.identityVerificationStatus !== 'none' && (
                                <Badge variant="outline" className="text-xs">
                                  DNI: {t(`admin.users.identityStatus.${u.identityVerificationStatus}`)}
                                </Badge>
                              )}
                              {u.bankAccountVerified && (
                                <Badge variant="outline" className="text-xs">{t('admin.users.bankVerified')}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.acceptedSellerTermsAt
                              ? formatDateShort(u.acceptedSellerTermsAt)
                              : t('admin.users.sellerSinceNo')}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDateShort(u.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openModal(u.id)}
                              className="gap-1"
                            >
                              <Pencil className="w-4 h-4" />
                              {t('admin.users.viewEdit')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('admin.users.pagination', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, total), total })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t('admin.users.prevPage')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t('admin.users.nextPage')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.users.modalTitle')}</DialogTitle>
            <DialogDescription>{t('admin.users.modalDescription')}</DialogDescription>
          </DialogHeader>
          {modalLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {modalError && (
                <p className="text-sm text-destructive">{modalError}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin.users.firstName')}</Label>
                  <Input
                    value={editForm.firstName ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.lastName')}</Label>
                  <Input
                    value={editForm.lastName ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('admin.users.publicName')}</Label>
                  <Input
                    value={editForm.publicName ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, publicName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('admin.users.email')}</Label>
                  <Input
                    type="email"
                    value={editForm.email ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.role')}</Label>
                  <Select
                    value={editForm.role ?? selectedUser.role}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="User">{t('admin.users.roleValue.User')}</SelectItem>
                      <SelectItem value="Admin">{t('admin.users.roleValue.Admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.status')}</Label>
                  <Select
                    value={editForm.status ?? selectedUser.status}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Enabled">{t('admin.users.statusValue.Enabled')}</SelectItem>
                      <SelectItem value="Disabled">{t('admin.users.statusValue.Disabled')}</SelectItem>
                      <SelectItem value="Suspended">{t('admin.users.statusValue.Suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('admin.users.phone')}</Label>
                  <Input
                    value={editForm.phone ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.emailVerified ?? false}
                      onChange={(e) => setEditForm((f) => ({ ...f, emailVerified: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{t('admin.users.emailVerified')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.phoneVerified ?? false}
                      onChange={(e) => setEditForm((f) => ({ ...f, phoneVerified: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{t('admin.users.phoneVerified')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.buyerDisputed ?? false}
                      onChange={(e) => setEditForm((f) => ({ ...f, buyerDisputed: e.target.checked }))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{t('admin.users.buyerDisputed')}</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.country')}</Label>
                  <Input
                    value={editForm.country ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="e.g. AR, US"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.currency')}</Label>
                  <Select
                    value={editForm.currency ?? selectedUser.currency}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.language')}</Label>
                  <Select
                    value={editForm.language ?? selectedUser.language}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, language: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">{t('admin.users.languageEs')}</SelectItem>
                      <SelectItem value="en">{t('admin.users.languageEn')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.tosAcceptedAt')}</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.tosAcceptedAt ? editForm.tosAcceptedAt.slice(0, 16) : ''}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        tosAcceptedAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.users.acceptedSellerTermsAt')}</Label>
                  <Input
                    type="datetime-local"
                    value={
                      editForm.acceptedSellerTermsAt
                        ? editForm.acceptedSellerTermsAt.slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        acceptedSellerTermsAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      }))
                    }
                  />
                </div>
              </div>

              {selectedUser.identityVerification && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium text-sm">{t('admin.users.identityVerification')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p className="text-muted-foreground">
                      {t('admin.users.legalName')}: {selectedUser.identityVerification.legalFirstName}{' '}
                      {selectedUser.identityVerification.legalLastName}
                    </p>
                    <p className="text-muted-foreground">
                      {t('admin.users.dateOfBirth')}: {selectedUser.identityVerification.dateOfBirth}
                    </p>
                    <p className="text-muted-foreground sm:col-span-2">
                      {t('admin.users.governmentId')}: *** (hidden)
                    </p>
                    <p className="text-muted-foreground">
                      {t('admin.users.submittedAt')}: {formatDateShort(selectedUser.identityVerification.submittedAt)}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">{t('admin.users.identityStatusLabel')}</Label>
                      <Select
                        value={editForm.identityVerification?.status ?? selectedUser.identityVerification.status}
                        onValueChange={(v) =>
                          setEditForm((f) => ({
                            ...f,
                            identityVerification: {
                              ...f.identityVerification,
                              status: v,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('admin.users.identityStatus.pending')}</SelectItem>
                          <SelectItem value="approved">{t('admin.users.identityStatus.approved')}</SelectItem>
                          <SelectItem value="rejected">{t('admin.users.identityStatus.rejected')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('admin.users.reviewedAt')}</Label>
                      <Input
                        type="datetime-local"
                        value={
                          editForm.identityVerification?.reviewedAt
                            ? editForm.identityVerification.reviewedAt.slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            identityVerification: {
                              ...f.identityVerification,
                              reviewedAt: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs">{t('admin.users.rejectionReason')}</Label>
                      <Input
                        value={editForm.identityVerification?.rejectionReason ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            identityVerification: {
                              ...f.identityVerification,
                              rejectionReason: e.target.value,
                            },
                          }))
                        }
                        placeholder={t('admin.users.rejectionReasonPlaceholder')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {(selectedUser.bankAccount || editForm.bankAccount) && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium text-sm">{t('admin.users.bankAccount')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">{t('admin.users.bankHolderName')}</Label>
                      <Input
                        value={editForm.bankAccount?.holderName ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            bankAccount: { ...f.bankAccount, holderName: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('admin.users.bankCbuCvu')}</Label>
                      <Input
                        value={editForm.bankAccount?.cbuOrCvu ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            bankAccount: { ...f.bankAccount, cbuOrCvu: e.target.value },
                          }))
                        }
                        placeholder="22 digits"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.bankAccount?.verified ?? false}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            bankAccount: { ...f.bankAccount, verified: e.target.checked },
                          }))
                        }
                        className="rounded border-input"
                      />
                      <span className="text-sm">{t('admin.users.bankVerified')}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('admin.users.bankVerifiedAt')}</Label>
                      <Input
                        type="datetime-local"
                        value={
                          editForm.bankAccount?.verifiedAt
                            ? editForm.bankAccount.verifiedAt.slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            bankAccount: {
                              ...f.bankAccount,
                              verifiedAt: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p>
                  <span className="font-medium">{t('admin.users.createdAt')}:</span>{' '}
                  {formatDateShort(selectedUser.createdAt)}
                </p>
                <p>
                  <span className="font-medium">{t('admin.users.updatedAt')}:</span>{' '}
                  {formatDateShort(selectedUser.updatedAt)}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={modalSaving}>
              {t('admin.users.close')}
            </Button>
            {selectedUser && (
              <Button onClick={handleSave} disabled={modalSaving}>
                {modalSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('admin.users.saving')}
                  </>
                ) : (
                  t('admin.users.save')
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserManagement;
