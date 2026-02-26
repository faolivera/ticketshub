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
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { adminService } from '../../../api/services/admin.service';
import type {
  PaymentMethodOption,
  PaymentMethodType,
  PaymentGatewayProvider,
  BankTransferConfig,
} from '../../../api/types/tickets';
import type {
  AdminCreatePaymentMethodRequest,
  AdminUpdatePaymentMethodRequest,
} from '../../../api/types/admin';

type FormMode = 'create' | 'edit';

interface FormData {
  name: string;
  publicName: string;
  type: PaymentMethodType;
  buyerCommissionPercent: string;
  gatewayProvider: PaymentGatewayProvider | '';
  gatewayConfigEnvPrefix: string;
  bankTransferConfig: BankTransferConfig;
}

const emptyBankConfig: BankTransferConfig = {
  cbu: '',
  accountHolderName: '',
  bankName: '',
  cuitCuil: '',
};

const initialFormData: FormData = {
  name: '',
  publicName: '',
  type: 'payment_gateway',
  buyerCommissionPercent: '',
  gatewayProvider: '',
  gatewayConfigEnvPrefix: '',
  bankTransferConfig: { ...emptyBankConfig },
};

export function PaymentMethodsManagement() {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMethod, setDeletingMethod] =
    useState<PaymentMethodOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getPaymentMethods();
      setPaymentMethods(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch payment methods'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (method: PaymentMethodOption) => {
    setFormMode('edit');
    setEditingId(method.id);
    setFormData({
      name: method.name,
      publicName: method.publicName,
      type: method.type,
      buyerCommissionPercent:
        method.buyerCommissionPercent?.toString() ?? '',
      gatewayProvider: method.gatewayProvider ?? '',
      gatewayConfigEnvPrefix: method.gatewayConfigEnvPrefix ?? '',
      bankTransferConfig: method.bankTransferConfig ?? { ...emptyBankConfig },
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (method: PaymentMethodOption) => {
    try {
      const newStatus = method.status === 'enabled' ? 'disabled' : 'enabled';
      await adminService.togglePaymentMethodStatus(method.id, newStatus);
      await fetchPaymentMethods();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to toggle status'
      );
    }
  };

  const handleOpenDelete = (method: PaymentMethodOption) => {
    setDeletingMethod(method);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMethod) return;
    try {
      setDeleting(true);
      await adminService.deletePaymentMethod(deletingMethod.id);
      setIsDeleteDialogOpen(false);
      setDeletingMethod(null);
      await fetchPaymentMethods();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete payment method'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError(t('admin.paymentMethods.errors.nameRequired'));
      return;
    }

    if (!formData.publicName.trim()) {
      setFormError(t('admin.paymentMethods.errors.publicNameRequired'));
      return;
    }

    if (formData.type === 'payment_gateway') {
      if (!formData.gatewayProvider) {
        setFormError(t('admin.paymentMethods.errors.providerRequired'));
        return;
      }
      if (!formData.gatewayConfigEnvPrefix.trim()) {
        setFormError(t('admin.paymentMethods.errors.envPrefixRequired'));
        return;
      }
    }

    if (formData.type === 'manual_approval') {
      const bc = formData.bankTransferConfig;
      if (!bc.cbu || !bc.accountHolderName || !bc.bankName || !bc.cuitCuil) {
        setFormError(t('admin.paymentMethods.errors.bankConfigRequired'));
        return;
      }
    }

    try {
      setSaving(true);

      const buyerCommission = formData.buyerCommissionPercent
        ? parseFloat(formData.buyerCommissionPercent)
        : null;

      if (formMode === 'create') {
        const request: AdminCreatePaymentMethodRequest = {
          name: formData.name,
          publicName: formData.publicName,
          type: formData.type,
          buyerCommissionPercent: buyerCommission,
          ...(formData.type === 'payment_gateway' && {
            gatewayProvider: formData.gatewayProvider as PaymentGatewayProvider,
            gatewayConfigEnvPrefix: formData.gatewayConfigEnvPrefix,
          }),
          ...(formData.type === 'manual_approval' && {
            bankTransferConfig: formData.bankTransferConfig,
          }),
        };
        await adminService.createPaymentMethod(request);
      } else if (editingId) {
        const request: AdminUpdatePaymentMethodRequest = {
          name: formData.name,
          publicName: formData.publicName,
          buyerCommissionPercent: buyerCommission,
          ...(formData.type === 'payment_gateway' && {
            gatewayProvider: formData.gatewayProvider as PaymentGatewayProvider,
            gatewayConfigEnvPrefix: formData.gatewayConfigEnvPrefix,
          }),
          ...(formData.type === 'manual_approval' && {
            bankTransferConfig: formData.bankTransferConfig,
          }),
        };
        await adminService.updatePaymentMethod(editingId, request);
      }

      setIsDialogOpen(false);
      await fetchPaymentMethods();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save payment method'
      );
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: PaymentMethodType) => {
    return type === 'payment_gateway' ? (
      <CreditCard className="h-4 w-4" />
    ) : (
      <Building2 className="h-4 w-4" />
    );
  };

  const getProviderLabel = (provider?: PaymentGatewayProvider) => {
    switch (provider) {
      case 'mercadopago':
        return 'MercadoPago';
      case 'uala_bis':
        return 'UALA BIS';
      case 'payway':
        return 'Payway';
      case 'astropay':
        return 'AstroPay';
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('admin.paymentMethods.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.paymentMethods.subtitle')}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.paymentMethods.create')}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.paymentMethods.listTitle')}</CardTitle>
          <CardDescription>
            {t('admin.paymentMethods.listDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.paymentMethods.noMethods')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.paymentMethods.table.name')}</TableHead>
                  <TableHead>{t('admin.paymentMethods.table.type')}</TableHead>
                  <TableHead>
                    {t('admin.paymentMethods.table.provider')}
                  </TableHead>
                  <TableHead>
                    {t('admin.paymentMethods.table.buyerCommission')}
                  </TableHead>
                  <TableHead>
                    {t('admin.paymentMethods.table.status')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('admin.paymentMethods.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(method.type)}
                        {method.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`admin.paymentMethods.types.${method.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {method.type === 'payment_gateway'
                        ? getProviderLabel(method.gatewayProvider)
                        : method.bankTransferConfig?.bankName || '-'}
                    </TableCell>
                    <TableCell>
                      {method.buyerCommissionPercent != null
                        ? `${method.buyerCommissionPercent}%`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={method.status === 'enabled'}
                          onCheckedChange={() => handleToggleStatus(method)}
                        />
                        <Badge
                          variant={
                            method.status === 'enabled'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {t(`admin.paymentMethods.status.${method.status}`)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(method)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(method)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create'
                ? t('admin.paymentMethods.createTitle')
                : t('admin.paymentMethods.editTitle')}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? t('admin.paymentMethods.createDescription')
                : t('admin.paymentMethods.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                {t('admin.paymentMethods.form.name')}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t('admin.paymentMethods.form.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicName">
                {t('admin.paymentMethods.form.publicName')}
              </Label>
              <Input
                id="publicName"
                value={formData.publicName}
                onChange={(e) =>
                  setFormData({ ...formData, publicName: e.target.value })
                }
                placeholder={t('admin.paymentMethods.form.publicNamePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('admin.paymentMethods.form.publicNameHint')}
              </p>
            </div>

            {formMode === 'create' && (
              <div className="space-y-2">
                <Label>{t('admin.paymentMethods.form.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: PaymentMethodType) =>
                    setFormData({
                      ...formData,
                      type: value,
                      gatewayProvider: '',
                      gatewayConfigEnvPrefix: '',
                      bankTransferConfig: { ...emptyBankConfig },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_gateway">
                      {t('admin.paymentMethods.types.payment_gateway')}
                    </SelectItem>
                    <SelectItem value="manual_approval">
                      {t('admin.paymentMethods.types.manual_approval')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyerCommission">
                  {t('admin.paymentMethods.form.buyerCommission')}
                </Label>
                <Input
                  id="buyerCommission"
                  type="number"
                  step="0.1"
                  value={formData.buyerCommissionPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buyerCommissionPercent: e.target.value,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {formData.type === 'payment_gateway' && (
              <>
                <div className="space-y-2">
                  <Label>
                    {t('admin.paymentMethods.form.gatewayProvider')}
                  </Label>
                  <Select
                    value={formData.gatewayProvider}
                    onValueChange={(value: PaymentGatewayProvider) =>
                      setFormData({ ...formData, gatewayProvider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          'admin.paymentMethods.form.selectProvider'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mercadopago">MercadoPago</SelectItem>
                      <SelectItem value="uala_bis">UALA BIS</SelectItem>
                      <SelectItem value="payway">Payway</SelectItem>
                      <SelectItem value="astropay">AstroPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="envPrefix">
                    {t('admin.paymentMethods.form.envPrefix')}
                  </Label>
                  <Input
                    id="envPrefix"
                    value={formData.gatewayConfigEnvPrefix}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gatewayConfigEnvPrefix: e.target.value,
                      })
                    }
                    placeholder="MERCADOPAGO_MAIN"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('admin.paymentMethods.form.envPrefixHint')}
                  </p>
                </div>
              </>
            )}

            {formData.type === 'manual_approval' && (
              <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-medium">
                  {t('admin.paymentMethods.form.bankConfig')}
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="cbu">
                    {t('admin.paymentMethods.form.cbu')}
                  </Label>
                  <Input
                    id="cbu"
                    value={formData.bankTransferConfig.cbu}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankTransferConfig: {
                          ...formData.bankTransferConfig,
                          cbu: e.target.value,
                        },
                      })
                    }
                    placeholder="0000000000000000000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolder">
                    {t('admin.paymentMethods.form.accountHolder')}
                  </Label>
                  <Input
                    id="accountHolder"
                    value={formData.bankTransferConfig.accountHolderName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankTransferConfig: {
                          ...formData.bankTransferConfig,
                          accountHolderName: e.target.value,
                        },
                      })
                    }
                    placeholder="TicketsHub SA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    {t('admin.paymentMethods.form.bankName')}
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankTransferConfig.bankName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankTransferConfig: {
                          ...formData.bankTransferConfig,
                          bankName: e.target.value,
                        },
                      })
                    }
                    placeholder="Banco Nacion"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuitCuil">
                    {t('admin.paymentMethods.form.cuitCuil')}
                  </Label>
                  <Input
                    id="cuitCuil"
                    value={formData.bankTransferConfig.cuitCuil}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankTransferConfig: {
                          ...formData.bankTransferConfig,
                          cuitCuil: e.target.value,
                        },
                      })
                    }
                    placeholder="30-12345678-9"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? t('common.saving')
                : formMode === 'create'
                  ? t('common.create')
                  : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.paymentMethods.deleteTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.paymentMethods.deleteDescription', {
                name: deletingMethod?.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
