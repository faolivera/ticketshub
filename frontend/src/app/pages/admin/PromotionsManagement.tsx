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
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Tag, Plus, X, Ticket, Pencil } from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import type {
  AdminPromotionListItem,
  AdminCreatePromotionRequest,
  AdminPromotionCodeListItem,
  AdminCreatePromotionCodeRequest,
  PromotionType,
  PromotionStatus,
  PromotionConfigTarget,
  AdminUserSearchItem,
} from '../../../api/types/admin';

const EMAIL_AUTOCOMPLETE_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export function PromotionsManagement() {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<AdminPromotionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AdminCreatePromotionRequest>({
    name: '',
    type: 'SELLER_DISCOUNTED_FEE',
    config: { feePercentage: 0 },
    maxUsages: 0,
    validUntil: undefined,
    emails: [],
  });
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [suggestions, setSuggestions] = useState<AdminUserSearchItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Promotion codes tab state
  const [activeTab, setActiveTab] = useState<'promotions' | 'promotion-codes'>('promotions');
  const [promotionCodes, setPromotionCodes] = useState<AdminPromotionCodeListItem[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [createCodeOpen, setCreateCodeOpen] = useState(false);
  const [createCodeForm, setCreateCodeForm] = useState<AdminCreatePromotionCodeRequest>({
    code: '',
    target: 'buyer',
    promotionConfig: {
      type: 'SELLER_DISCOUNTED_FEE',
      config: { feePercentage: 0 },
      maxUsages: 0,
      validUntil: undefined,
    },
    maxUsages: 0,
    validUntil: undefined,
  });
  const [creatingCode, setCreatingCode] = useState(false);
  const [createCodeError, setCreateCodeError] = useState<string | null>(null);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { status?: string; type?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      const data = await adminService.getPromotions(params);
      setPromotions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch promotions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [statusFilter, typeFilter]);

  const fetchPromotionCodes = async () => {
    try {
      setCodesLoading(true);
      setCodesError(null);
      const data = await adminService.getPromotionCodes();
      setPromotionCodes(data);
    } catch (err) {
      setCodesError(err instanceof Error ? err.message : 'Failed to fetch promotion codes');
    } finally {
      setCodesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'promotion-codes') fetchPromotionCodes();
  }, [activeTab]);

  useEffect(() => {
    if (createOpen) {
      setSelectedEmails([]);
      setEmailInput('');
      setSuggestions([]);
    }
  }, [createOpen]);

  // Debounced user search for email autocomplete
  useEffect(() => {
    const term = emailInput.trim().toLowerCase();
    if (term.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const results = await adminService.searchUsersByEmail(term);
        setSuggestions(
          results.filter((u) => !selectedEmails.includes(u.email.toLowerCase()))
        );
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, EMAIL_AUTOCOMPLETE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [emailInput, selectedEmails]);

  const addEmail = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setSelectedEmails((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized]
    );
    setEmailInput('');
    setSuggestions([]);
  }, []);

  const removeEmail = useCallback((email: string) => {
    setSelectedEmails((prev) => prev.filter((e) => e !== email));
  }, []);

  const handleEmailInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions.length > 0) {
          addEmail(suggestions[0].email);
        } else if (emailInput.trim()) {
          addEmail(emailInput);
        }
      }
    },
    [suggestions, emailInput, addEmail]
  );

  const handleCreate = async () => {
    const emails = selectedEmails;
    if (!createForm.name.trim()) {
      setCreateError(t('admin.promotions.nameRequired'));
      return;
    }
    if (emails.length === 0) {
      setCreateError(t('admin.promotions.emailsRequired'));
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await adminService.createPromotion({
        ...createForm,
        emails,
      });
      setCreateOpen(false);
      setCreateForm({
        name: '',
        type: 'SELLER_DISCOUNTED_FEE',
        config: { feePercentage: 0 },
        maxUsages: 0,
        validUntil: undefined,
        emails: [],
      });
      setSelectedEmails([]);
      setEmailInput('');
      setSuggestions([]);
      await fetchPromotions();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : t('admin.promotions.createError')
      );
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: PromotionStatus) => {
    try {
      setUpdatingId(id);
      await adminService.updatePromotionStatus(id, newStatus);
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const openCreateCodeModal = () => {
    setEditingCodeId(null);
    setCreateCodeForm({
      code: '',
      target: 'buyer',
      promotionConfig: {
        type: 'SELLER_DISCOUNTED_FEE',
        config: { feePercentage: 0 },
        maxUsages: 0,
        validUntil: undefined,
      },
      maxUsages: 0,
      validUntil: undefined,
    });
    setCreateCodeError(null);
    setCreateCodeOpen(true);
  };

  const openEditCodeModal = (pc: AdminPromotionCodeListItem) => {
    setEditingCodeId(pc.id);
    setCreateCodeForm({
      code: pc.code,
      target: pc.target,
      promotionConfig: {
        type: pc.promotionConfig.type,
        config: { ...pc.promotionConfig.config },
        maxUsages: pc.promotionConfig.maxUsages,
        validUntil: pc.promotionConfig.validUntil ?? undefined,
      },
      maxUsages: pc.maxUsages,
      validUntil: pc.validUntil ?? undefined,
    });
    setCreateCodeError(null);
    setCreateCodeOpen(true);
  };

  const handleSaveCode = async () => {
    if (!createCodeForm.code.trim()) {
      setCreateCodeError(t('admin.promotionCodes.codeRequired'));
      return;
    }
    try {
      setCreatingCode(true);
      setCreateCodeError(null);
      if (editingCodeId) {
        await adminService.updatePromotionCode(editingCodeId, createCodeForm);
      } else {
        await adminService.createPromotionCode(createCodeForm);
      }
      setCreateCodeOpen(false);
      setEditingCodeId(null);
      setCreateCodeForm({
        code: '',
        target: 'buyer',
        promotionConfig: {
          type: 'SELLER_DISCOUNTED_FEE',
          config: { feePercentage: 0 },
          maxUsages: 0,
          validUntil: undefined,
        },
        maxUsages: 0,
        validUntil: undefined,
      });
      await fetchPromotionCodes();
    } catch (err) {
      setCreateCodeError(
        err instanceof Error
          ? err.message
          : editingCodeId
            ? t('admin.promotionCodes.editError')
            : t('admin.promotionCodes.createError')
      );
    } finally {
      setCreatingCode(false);
    }
  };

  const formatTargetLabel = (target: PromotionConfigTarget) =>
    t(`admin.promotionCodes.target.${target}`);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' }) : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.promotions.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.promotions.description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'promotions' | 'promotion-codes')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {t('admin.promotions.tabPromotions')}
          </TabsTrigger>
          <TabsTrigger value="promotion-codes" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            {t('admin.promotions.tabPromotionCodes')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t('admin.promotions.listTitle')}</CardTitle>
            <CardDescription>{t('admin.promotions.listDescription')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t('admin.promotions.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.promotions.filterAll')}</SelectItem>
                <SelectItem value="active">{t('admin.promotions.statusActive')}</SelectItem>
                <SelectItem value="inactive">{t('admin.promotions.statusInactive')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.promotions.filterType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.promotions.filterAll')}</SelectItem>
                <SelectItem value="SELLER_DISCOUNTED_FEE">
                  {t('admin.promotions.typeSellerDiscountedFee')}
                </SelectItem>
                <SelectItem value="BUYER_DISCOUNTED_FEE">
                  {t('admin.promotions.typeBuyerDiscountedFee')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.promotions.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.promotions.user')}</TableHead>
                  <TableHead>{t('admin.promotions.name')}</TableHead>
                  <TableHead>{t('admin.promotions.type')}</TableHead>
                  <TableHead>{t('admin.promotions.feePercent')}</TableHead>
                  <TableHead>{t('admin.promotions.usages')}</TableHead>
                  <TableHead>{t('admin.promotions.status')}</TableHead>
                  <TableHead>{t('admin.promotions.validUntil')}</TableHead>
                  <TableHead>{t('admin.promotions.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('admin.promotions.noPromotions')}
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="font-medium">{p.userEmail ?? p.userId}</span>
                      </TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.type}</Badge>
                      </TableCell>
                      <TableCell>{p.config.feePercentage}%</TableCell>
                      <TableCell>
                        {p.usedCount} / {p.maxUsages === 0 ? '∞' : p.maxUsages}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                          {p.status === 'active'
                            ? t('admin.promotions.statusActive')
                            : t('admin.promotions.statusInactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(p.validUntil)}</TableCell>
                      <TableCell>
                        {p.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === p.id}
                            onClick={() => handleUpdateStatus(p.id, 'inactive')}
                          >
                            {t('admin.promotions.deactivate')}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === p.id}
                            onClick={() => handleUpdateStatus(p.id, 'active')}
                          >
                            {t('admin.promotions.activate')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.promotions.createTitle')}</DialogTitle>
            <DialogDescription>{t('admin.promotions.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {createError}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('admin.promotions.name')}</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('admin.promotions.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.promotions.type')}</Label>
              <Select
                value={createForm.type}
                onValueChange={(v: PromotionType) =>
                  setCreateForm((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELLER_DISCOUNTED_FEE">
                    {t('admin.promotions.typeSellerDiscountedFee')}
                  </SelectItem>
                  <SelectItem value="BUYER_DISCOUNTED_FEE">
                    {t('admin.promotions.typeBuyerDiscountedFee')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.promotions.feePercent')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={createForm.config.feePercentage}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      feePercentage: Number(e.target.value) || 0,
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.promotions.maxUsages')}</Label>
              <Input
                type="number"
                min={0}
                value={createForm.maxUsages}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    maxUsages: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.promotions.maxUsagesHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.promotions.validUntil')}</Label>
              <Input
                type="datetime-local"
                value={
                  createForm.validUntil
                    ? createForm.validUntil.slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    validUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.promotions.emails')}</Label>
              <div className="relative">
                <div className="flex min-h-[100px] w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {selectedEmails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="rounded-full p-0.5 hover:bg-muted"
                        aria-label={t('admin.promotions.removeEmail', { email })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="email"
                    className="min-w-[180px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={handleEmailInputKeyDown}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      const parts = pasted.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
                      if (parts.length > 1) {
                        e.preventDefault();
                        setSelectedEmails((prev) => {
                          const next = [...prev];
                          parts.forEach((p) => {
                            if (p && !next.includes(p)) next.push(p);
                          });
                          return next;
                        });
                        setEmailInput('');
                        setSuggestions([]);
                      }
                    }}
                    placeholder={t('admin.promotions.emailsPlaceholder')}
                    autoComplete="off"
                  />
                </div>
                {emailInput.trim().length >= MIN_SEARCH_LENGTH &&
                  (loadingSuggestions || suggestions.length > 0) && (
                  <ul
                    ref={suggestionsRef}
                    className="absolute z-50 mt-1 max-h-[200px] w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
                  >
                    {loadingSuggestions ? (
                      <li className="px-3 py-2 text-sm text-muted-foreground">
                        {t('common.loading')}
                      </li>
                    ) : (
                      suggestions.map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => addEmail(user.email)}
                          >
                            {user.email}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('admin.promotions.emailsAutocompleteHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t('common.saving') : t('admin.promotions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="promotion-codes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t('admin.promotionCodes.listTitle')}</CardTitle>
                <CardDescription>{t('admin.promotionCodes.listDescription')}</CardDescription>
              </div>
              <Button onClick={openCreateCodeModal}>
                <Plus className="w-4 h-4 mr-2" />
                {t('admin.promotionCodes.create')}
              </Button>
            </CardHeader>
            <CardContent>
              {codesError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {codesError}
                </div>
              )}
              {codesLoading ? (
                <p className="text-muted-foreground">{t('common.loading')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.promotionCodes.code')}</TableHead>
                      <TableHead>{t('admin.promotionCodes.targetLabel')}</TableHead>
                      <TableHead>{t('admin.promotionCodes.type')}</TableHead>
                      <TableHead>{t('admin.promotionCodes.feePercent')}</TableHead>
                      <TableHead>{t('admin.promotionCodes.usages')}</TableHead>
                      <TableHead>{t('admin.promotionCodes.claimableUntil')}</TableHead>
                      <TableHead>{t('admin.promotionCodes.createdAt')}</TableHead>
                      <TableHead>{t('admin.promotions.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotionCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {t('admin.promotionCodes.noPromotionCodes')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      promotionCodes.map((pc) => (
                        <TableRow key={pc.id}>
                          <TableCell>
                            <span className="font-mono font-medium">{pc.code}</span>
                          </TableCell>
                          <TableCell>{formatTargetLabel(pc.target)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{pc.promotionConfig.type}</Badge>
                          </TableCell>
                          <TableCell>{pc.promotionConfig.config.feePercentage}%</TableCell>
                          <TableCell>
                            {pc.usedCount} / {pc.maxUsages === 0 ? '∞' : pc.maxUsages}
                          </TableCell>
                          <TableCell>{formatDate(pc.validUntil)}</TableCell>
                          <TableCell>{formatDate(pc.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditCodeModal(pc)}
                              aria-label={t('admin.promotionCodes.edit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={createCodeOpen} onOpenChange={setCreateCodeOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCodeId
                    ? t('admin.promotionCodes.editTitle')
                    : t('admin.promotionCodes.createTitle')}
                </DialogTitle>
                <DialogDescription>
                  {editingCodeId
                    ? t('admin.promotionCodes.editDescription')
                    : t('admin.promotionCodes.createDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {createCodeError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {createCodeError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.code')}</Label>
                  <Input
                    value={createCodeForm.code}
                    onChange={(e) =>
                      setCreateCodeForm((prev) => ({ ...prev, code: e.target.value.trim().toUpperCase() }))
                    }
                    placeholder={t('admin.promotionCodes.codePlaceholder')}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.targetLabel')}</Label>
                  <Select
                    value={createCodeForm.target}
                    onValueChange={(v: PromotionConfigTarget) =>
                      setCreateCodeForm((prev) => ({ ...prev, target: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">{t('admin.promotionCodes.target.buyer')}</SelectItem>
                      <SelectItem value="verified_buyer">{t('admin.promotionCodes.target.verified_buyer')}</SelectItem>
                      <SelectItem value="seller">{t('admin.promotionCodes.target.seller')}</SelectItem>
                      <SelectItem value="verified_seller">{t('admin.promotionCodes.target.verified_seller')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.type')}</Label>
                  <Select
                    value={createCodeForm.promotionConfig.type}
                    onValueChange={(v: PromotionType) =>
                      setCreateCodeForm((prev) => ({
                        ...prev,
                        promotionConfig: {
                          ...prev.promotionConfig,
                          type: v,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELLER_DISCOUNTED_FEE">
                        {t('admin.promotions.typeSellerDiscountedFee')}
                      </SelectItem>
                      <SelectItem value="BUYER_DISCOUNTED_FEE">
                        {t('admin.promotions.typeBuyerDiscountedFee')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.feePercent')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={createCodeForm.promotionConfig.config.feePercentage}
                    onChange={(e) =>
                      setCreateCodeForm((prev) => ({
                        ...prev,
                        promotionConfig: {
                          ...prev.promotionConfig,
                          config: {
                            ...prev.promotionConfig.config,
                            feePercentage: Number(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.promotionMaxUsages')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={createCodeForm.promotionConfig.maxUsages}
                    onChange={(e) =>
                      setCreateCodeForm((prev) => ({
                        ...prev,
                        promotionConfig: {
                          ...prev.promotionConfig,
                          maxUsages: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('admin.promotionCodes.promotionMaxUsagesHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.codeMaxUsages')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={createCodeForm.maxUsages}
                    onChange={(e) =>
                      setCreateCodeForm((prev) => ({
                        ...prev,
                        maxUsages: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('admin.promotionCodes.codeMaxUsagesHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.claimableUntil')}</Label>
                  <Input
                    type="datetime-local"
                    value={
                      createCodeForm.validUntil
                        ? createCodeForm.validUntil.slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setCreateCodeForm((prev) => ({
                        ...prev,
                        validUntil: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('admin.promotionCodes.claimableUntilHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.promotionCodes.validUntil')}</Label>
                  <Input
                    type="datetime-local"
                    value={
                      createCodeForm.promotionConfig.validUntil
                        ? createCodeForm.promotionConfig.validUntil.slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setCreateCodeForm((prev) => ({
                        ...prev,
                        promotionConfig: {
                          ...prev.promotionConfig,
                          validUntil: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('admin.promotionCodes.validUntilHint')}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateCodeOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveCode} disabled={creatingCode}>
                  {creatingCode
                    ? t('common.saving')
                    : editingCodeId
                      ? t('admin.promotionCodes.save')
                      : t('admin.promotionCodes.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PromotionsManagement;
