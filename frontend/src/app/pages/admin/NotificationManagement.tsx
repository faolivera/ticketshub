import { useState, useEffect, useCallback, Fragment } from 'react';
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
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { AlertCircle, Mail, Bell } from 'lucide-react';
import { notificationsAdminService } from '@/api/services/notifications-admin.service';
import type {
  NotificationChannelConfig,
  NotificationTemplate,
  NotificationEventType,
  NotificationPriority,
} from '@/api/types/notifications';
import { CHANNEL_GROUPS, TEMPLATE_VARIABLES, EVENT_TYPE_RECIPIENTS } from '@/api/types/notifications';
import type { NotificationRecipient } from '@/api/types/notifications';

const PRIORITY_OPTIONS: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const RECIPIENT_STYLES: Record<NotificationRecipient, string> = {
  buyer: 'bg-sky-100 text-sky-700 border-sky-200',
  seller: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  admin: 'bg-violet-100 text-violet-700 border-violet-200',
  counterparty: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function NotificationManagement() {
  const { t } = useTranslation();

  const fetchBothAsync = useCallback(async () => {
    const [configs, templateList] = await Promise.all([
      notificationsAdminService.getChannelConfigs(),
      notificationsAdminService.getTemplates(),
    ]);
    return { configs, templates: templateList };
  }, []);

  const { data, isLoading, error, execute, setData } = useAsync(fetchBothAsync);

  const channelConfigs: NotificationChannelConfig[] = data?.configs ?? [];
  const templates: NotificationTemplate[] = data?.templates ?? [];

  useEffect(() => {
    execute();
  }, [execute]);

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    titleTemplate: '',
    bodyTemplate: '',
    actionUrlTemplate: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [updatingConfigKey, setUpdatingConfigKey] = useState<string | null>(null);

  const getTemplateForChannel = (
    eventType: NotificationEventType,
    channel: 'IN_APP' | 'EMAIL'
  ): NotificationTemplate | undefined =>
    templates.find((t) => t.eventType === eventType && t.channel === channel && t.isActive);

  const getConfigForEventType = (eventType: NotificationEventType) =>
    channelConfigs.find((c) => c.eventType === eventType);

  const handleToggleChannel = async (
    config: NotificationChannelConfig,
    channel: 'inApp' | 'email'
  ) => {
    const key = `${config.eventType}-${channel}`;
    const newInApp = channel === 'inApp' ? !config.inAppEnabled : config.inAppEnabled;
    const newEmail = channel === 'email' ? !config.emailEnabled : config.emailEnabled;

    setUpdatingConfigKey(key);

    setData({
      configs: channelConfigs.map((c) =>
        c.id === config.id ? { ...c, inAppEnabled: newInApp, emailEnabled: newEmail } : c
      ),
      templates,
    });

    try {
      await notificationsAdminService.updateChannelConfig(config.eventType, {
        inAppEnabled: newInApp,
        emailEnabled: newEmail,
        priority: config.priority,
      });
      await execute();
    } catch (err) {
      void err;
      setData({
        configs: channelConfigs.map((c) =>
          c.id === config.id
            ? { ...c, inAppEnabled: config.inAppEnabled, emailEnabled: config.emailEnabled }
            : c
        ),
        templates,
      });
    } finally {
      setUpdatingConfigKey(null);
    }
  };

  const handlePriorityChange = async (
    config: NotificationChannelConfig,
    priority: NotificationPriority
  ) => {
    const key = `${config.eventType}-priority`;
    setUpdatingConfigKey(key);

    setData({
      configs: channelConfigs.map((c) => (c.id === config.id ? { ...c, priority } : c)),
      templates,
    });

    try {
      await notificationsAdminService.updateChannelConfig(config.eventType, {
        inAppEnabled: config.inAppEnabled,
        emailEnabled: config.emailEnabled,
        priority,
      });
      await execute();
    } catch (err) {
      void err;
      setData({
        configs: channelConfigs.map((c) =>
          c.id === config.id ? { ...c, priority: config.priority } : c
        ),
        templates,
      });
    } finally {
      setUpdatingConfigKey(null);
    }
  };

  const handleOpenEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateFormData({
      titleTemplate: template.titleTemplate,
      bodyTemplate: template.bodyTemplate,
      actionUrlTemplate: template.actionUrlTemplate || '',
      isActive: template.isActive,
    });
    setFormError(null);
    setIsTemplateDialogOpen(true);
  };

  const handleOpenEditForChannel = (
    eventType: NotificationEventType,
    channel: 'IN_APP' | 'EMAIL'
  ) => {
    const template = getTemplateForChannel(eventType, channel);
    if (!template) return;
    handleOpenEditTemplate(template);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    if (!templateFormData.titleTemplate.trim()) {
      setFormError(t('admin.notifications.templates.errors.titleRequired'));
      return;
    }

    if (!templateFormData.bodyTemplate.trim()) {
      setFormError(t('admin.notifications.templates.errors.bodyRequired'));
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      await notificationsAdminService.updateTemplate(editingTemplate.id, {
        titleTemplate: templateFormData.titleTemplate,
        bodyTemplate: templateFormData.bodyTemplate,
        actionUrlTemplate: templateFormData.actionUrlTemplate || undefined,
        isActive: templateFormData.isActive,
      });
      setIsTemplateDialogOpen(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.notifications.title')}
        </h1>
        <p className="text-muted-foreground">{t('admin.notifications.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.notifications.channels.title')}</CardTitle>
          <CardDescription>{t('admin.notifications.channels.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">
                  {t('admin.notifications.channels.table.eventType')}
                </TableHead>
                <TableHead className="w-44">
                  {t('admin.notifications.channels.table.recipients')}
                </TableHead>
                <TableHead className="text-center w-24">
                  {t('admin.notifications.channels.table.inApp')}
                </TableHead>
                <TableHead className="text-center w-24">
                  {t('admin.notifications.channels.table.email')}
                </TableHead>
                <TableHead className="w-36">
                  {t('admin.notifications.channels.table.priority')}
                </TableHead>
                <TableHead className="w-48">
                  {t('admin.notifications.channels.table.templates')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CHANNEL_GROUPS.map((group) => (
                <Fragment key={group.labelKey}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={6}
                      className="py-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t(group.labelKey)}
                    </TableCell>
                  </TableRow>
                  {group.types.map((eventType) => {
                    const config = getConfigForEventType(eventType);
                    if (!config) return null;
                    const inAppTemplate = getTemplateForChannel(eventType, 'IN_APP');
                    const emailTemplate = getTemplateForChannel(eventType, 'EMAIL');
                    return (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {t(`admin.notifications.eventTypes.${eventType}`)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {t(`admin.notifications.eventTypeDescriptions.${eventType}`)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(EVENT_TYPE_RECIPIENTS[eventType] ?? []).map((recipient) => (
                              <span
                                key={recipient}
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${RECIPIENT_STYLES[recipient]}`}
                              >
                                {t(`admin.notifications.recipients.${recipient}`)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={config.inAppEnabled}
                              disabled={updatingConfigKey === `${config.eventType}-inApp`}
                              onCheckedChange={() => handleToggleChannel(config, 'inApp')}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={config.emailEnabled}
                              disabled={updatingConfigKey === `${config.eventType}-email`}
                              onCheckedChange={() => handleToggleChannel(config, 'email')}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={config.priority}
                            disabled={updatingConfigKey === `${config.eventType}-priority`}
                            onValueChange={(value: NotificationPriority) =>
                              handlePriorityChange(config, value)
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIORITY_OPTIONS.map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {t(`admin.notifications.priority.${priority}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!inAppTemplate}
                              onClick={() => handleOpenEditForChannel(eventType, 'IN_APP')}
                              className="h-7 gap-1.5 text-xs"
                            >
                              <Bell className="h-3 w-3" />
                              In-App
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!emailTemplate}
                              onClick={() => handleOpenEditForChannel(eventType, 'EMAIL')}
                              className="h-7 gap-1.5 text-xs"
                            >
                              <Mail className="h-3 w-3" />
                              Email
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.notifications.templates.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.notifications.templates.editDescription')}
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
                  {t(`admin.notifications.eventTypes.${editingTemplate.eventType}`)}
                </span>
                {' · '}
                {editingTemplate.channel === 'IN_APP' ? 'In-App' : 'Email'}
                {' · '}
                {editingTemplate.locale.toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="titleTemplate">
                {t('admin.notifications.templates.form.title')}
              </Label>
              <Input
                id="titleTemplate"
                value={templateFormData.titleTemplate}
                onChange={(e) =>
                  setTemplateFormData({ ...templateFormData, titleTemplate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyTemplate">
                {t('admin.notifications.templates.form.body')}
              </Label>
              <Textarea
                id="bodyTemplate"
                value={templateFormData.bodyTemplate}
                onChange={(e) =>
                  setTemplateFormData({ ...templateFormData, bodyTemplate: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionUrlTemplate">
                {t('admin.notifications.templates.form.actionUrl')}
              </Label>
              <Input
                id="actionUrlTemplate"
                value={templateFormData.actionUrlTemplate}
                onChange={(e) =>
                  setTemplateFormData({
                    ...templateFormData,
                    actionUrlTemplate: e.target.value,
                  })
                }
                placeholder="/transaction/{{transactionId}}"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={templateFormData.isActive}
                onCheckedChange={(checked) =>
                  setTemplateFormData({ ...templateFormData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">
                {t('admin.notifications.templates.form.active')}
              </Label>
            </div>

            {editingTemplate && (
              <div className="space-y-2">
                <Label>{t('admin.notifications.templates.form.variables')}</Label>
                <div className="flex flex-wrap gap-1">
                  {(TEMPLATE_VARIABLES[editingTemplate.eventType] ?? []).map((variable) => (
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
              onClick={() => setIsTemplateDialogOpen(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
