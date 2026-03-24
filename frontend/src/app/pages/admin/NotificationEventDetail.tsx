import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAsync } from '@/app/hooks';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { AlertCircle, ArrowLeft, Bell, Mail, Pencil, Eye } from 'lucide-react';
import { notificationsAdminService } from '@/api/services/notifications-admin.service';
import type {
  NotificationEventType,
  NotificationTemplate,
  NotificationPriority,
  NotificationRecipientRole,
  GetNotificationEventDetailResponse,
} from '@/api/types/notifications';
import { EVENT_TYPE_RECIPIENTS, getTemplateVariables } from '@/api/types/notifications';

const PRIORITY_OPTIONS: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const ROLE_STYLES: Record<NotificationRecipientRole, string> = {
  BUYER: 'bg-sky-100 text-sky-700 border-sky-200',
  SELLER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ADMIN: 'bg-violet-100 text-violet-700 border-violet-200',
};

export function NotificationEventDetail() {
  const { eventType } = useParams<{ eventType: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchDetail = useCallback(
    () =>
      notificationsAdminService.getNotificationEventDetail(
        eventType as NotificationEventType,
      ),
    [eventType],
  );

  const { data, isLoading, error, execute, setData } =
    useAsync<GetNotificationEventDetailResponse>(fetchDetail);

  useEffect(() => {
    execute();
  }, [execute]);

  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState({
    titleTemplate: '',
    bodyTemplate: '',
    actionUrlTemplate: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleToggleChannel = async (channel: 'inApp' | 'email') => {
    if (!data) return;
    const { channelConfig } = data;
    const key = `channel-${channel}`;
    const newInApp = channel === 'inApp' ? !channelConfig.inAppEnabled : channelConfig.inAppEnabled;
    const newEmail = channel === 'email' ? !channelConfig.emailEnabled : channelConfig.emailEnabled;

    setUpdatingKey(key);
    setData({ ...data, channelConfig: { ...channelConfig, inAppEnabled: newInApp, emailEnabled: newEmail } });

    try {
      await notificationsAdminService.updateChannelConfig(channelConfig.eventType, {
        inAppEnabled: newInApp,
        emailEnabled: newEmail,
        priority: channelConfig.priority,
      });
      await execute();
    } catch (err) {
      void err;
      setData({ ...data, channelConfig });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handlePriorityChange = async (priority: NotificationPriority) => {
    if (!data) return;
    const { channelConfig } = data;

    setUpdatingKey('priority');
    setData({ ...data, channelConfig: { ...channelConfig, priority } });

    try {
      await notificationsAdminService.updateChannelConfig(channelConfig.eventType, {
        inAppEnabled: channelConfig.inAppEnabled,
        emailEnabled: channelConfig.emailEnabled,
        priority,
      });
      await execute();
    } catch (err) {
      void err;
      setData({ ...data, channelConfig });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleOpenEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      titleTemplate: template.titleTemplate,
      bodyTemplate: template.bodyTemplate,
      actionUrlTemplate: template.actionUrlTemplate ?? '',
      isActive: template.isActive,
    });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    if (!formData.titleTemplate.trim()) {
      setFormError(t('admin.notifications.detail.errors.titleRequired'));
      return;
    }
    if (!formData.bodyTemplate.trim()) {
      setFormError(t('admin.notifications.detail.errors.bodyRequired'));
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      await notificationsAdminService.updateTemplate(editingTemplate.id, {
        titleTemplate: formData.titleTemplate,
        bodyTemplate: formData.bodyTemplate,
        actionUrlTemplate: formData.actionUrlTemplate || undefined,
        isActive: formData.isActive,
      });
      setIsDialogOpen(false);
      await execute();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/notifications')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('admin.notifications.detail.backToList')}
        </Button>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error ?? t('common.error')}
        </div>
      </div>
    );
  }

  const { channelConfig, templatesByRole } = data;
  const roles = EVENT_TYPE_RECIPIENTS[eventType as NotificationEventType] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/notifications')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('admin.notifications.detail.backToList')}
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t(`admin.notifications.eventTypes.${eventType}`)}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t(`admin.notifications.eventTypeDescriptions.${eventType}`)}
          </p>
        </div>
      </div>

      {/* Channel Config */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.notifications.detail.channelConfig')}</CardTitle>
          <CardDescription>
            {t('admin.notifications.detail.channelConfigDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="inAppToggle" className="cursor-pointer">
                {t('admin.notifications.detail.inApp')}
              </Label>
              <Switch
                id="inAppToggle"
                checked={channelConfig.inAppEnabled}
                disabled={updatingKey === 'channel-inApp'}
                onCheckedChange={() => handleToggleChannel('inApp')}
              />
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="emailToggle" className="cursor-pointer">
                {t('admin.notifications.detail.email')}
              </Label>
              <Switch
                id="emailToggle"
                checked={channelConfig.emailEnabled}
                disabled={updatingKey === 'channel-email'}
                onCheckedChange={() => handleToggleChannel('email')}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label>{t('admin.notifications.detail.priority')}</Label>
              <Select
                value={channelConfig.priority}
                disabled={updatingKey === 'priority'}
                onValueChange={(v: NotificationPriority) => handlePriorityChange(v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`admin.notifications.priority.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates by Role */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.notifications.detail.templates')}</CardTitle>
          <CardDescription>
            {t('admin.notifications.detail.templatesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {roles.map((role) => {
              const roleGroup = templatesByRole[role];
              const roleTemplates = roleGroup?.templates ?? [];
              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}
                    >
                      {t(`admin.notifications.recipients.${role}`)}
                    </span>
                  </div>

                  {roleTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('admin.notifications.detail.noTemplates')}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {roleTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onEdit={handleOpenEdit}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.notifications.detail.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.notifications.detail.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            {editingTemplate && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">
                  {editingTemplate.channel === 'IN_APP' ? 'In-App' : 'Email'}
                </span>
                {' · '}
                {editingTemplate.locale.toUpperCase()}
                {' · '}
                {t(`admin.notifications.recipients.${editingTemplate.recipientRole}`)}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="titleTemplate">
                {t('admin.notifications.detail.form.title')}
              </Label>
              <Input
                id="titleTemplate"
                value={formData.titleTemplate}
                onChange={(e) => setFormData({ ...formData, titleTemplate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyTemplate">
                {t('admin.notifications.detail.form.body')}
              </Label>
              <Textarea
                id="bodyTemplate"
                value={formData.bodyTemplate}
                onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionUrlTemplate">
                {t('admin.notifications.detail.form.actionUrl')}
              </Label>
              <Input
                id="actionUrlTemplate"
                value={formData.actionUrlTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, actionUrlTemplate: e.target.value })
                }
                placeholder="/transaction/{{transactionId}}"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">
                {t('admin.notifications.detail.form.active')}
              </Label>
            </div>

            {editingTemplate && (
              <div className="space-y-2">
                <Label>{t('admin.notifications.detail.form.variables')}</Label>
                <div className="flex flex-wrap gap-1">
                  {getTemplateVariables(
                    editingTemplate.eventType,
                    editingTemplate.recipientRole,
                  ).map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs font-mono">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
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
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  template: NotificationTemplate;
  onEdit: (template: NotificationTemplate) => void;
  t: (key: string) => string;
}

function TemplateCard({ template, onEdit, t }: TemplateCardProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async () => {
    setPreviewOpen(true);
    if (previewHtml) return;
    setLoadingPreview(true);
    try {
      const html = await notificationsAdminService.getTemplatePreview(template.id);
      setPreviewHtml(html);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {template.channel === 'IN_APP' ? (
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium">
              {template.channel === 'IN_APP' ? 'In-App' : 'Email'}
            </span>
            <span className="text-xs text-muted-foreground">
              {template.locale.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={template.isActive ? 'default' : 'secondary'}
              className="text-xs"
            >
              {template.isActive
                ? t('admin.notifications.detail.active')
                : t('admin.notifications.detail.inactive')}
            </Badge>
            {template.channel === 'EMAIL' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePreview}
                title="Vista previa del email"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(template)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium truncate">{template.titleTemplate}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {template.bodyTemplate}
          </p>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Vista previa del email
            </DialogTitle>
            <DialogDescription className="text-xs">
              {template.titleTemplate} · {template.locale.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {t('common.loading')}
              </div>
            ) : previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
