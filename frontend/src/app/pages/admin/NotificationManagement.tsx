import { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertCircle, Pencil, Mail, Bell } from 'lucide-react';
import { notificationsAdminService } from '@/api/services/notifications-admin.service';
import type {
  NotificationChannelConfig,
  NotificationTemplate,
  NotificationEventType,
  NotificationPriority,
} from '@/api/types/notifications';
import { ALL_EVENT_TYPES, TEMPLATE_VARIABLES } from '@/api/types/notifications';

const PRIORITY_OPTIONS: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/** Stable order for channel configs (backend returns undefined order). */
function sortChannelConfigsByEventType(
  configs: NotificationChannelConfig[]
): NotificationChannelConfig[] {
  const order = new Map(ALL_EVENT_TYPES.map((t, i) => [t, i]));
  return [...configs].sort(
    (a, b) => (order.get(a.eventType) ?? 999) - (order.get(b.eventType) ?? 999)
  );
}

export function NotificationManagement() {
  const { t } = useTranslation();

  const fetchBothAsync = useCallback(async () => {
    const [configs, templateList] = await Promise.all([
      notificationsAdminService.getChannelConfigs(),
      notificationsAdminService.getTemplates(),
    ]);
    return {
      configs: sortChannelConfigsByEventType(configs),
      templates: templateList,
    };
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
  /** Tracks which channel config is being updated (e.g. 'PAYMENT_REQUIRED-inApp') for loading state */
  const [updatingConfigKey, setUpdatingConfigKey] = useState<string | null>(null);

  const handleToggleChannel = async (
    config: NotificationChannelConfig,
    channel: 'inApp' | 'email'
  ) => {
    const key = `${config.eventType}-${channel}`;
    const newInApp = channel === 'inApp' ? !config.inAppEnabled : config.inAppEnabled;
    const newEmail = channel === 'email' ? !config.emailEnabled : config.emailEnabled;

    setUpdatingConfigKey(key);

    // Optimistic update so the toggle flips immediately
    setData({
      configs: channelConfigs.map((c) =>
        c.id === config.id
          ? { ...c, inAppEnabled: newInApp, emailEnabled: newEmail }
          : c
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
      // Roll back optimistic update; the hook will surface the error on the next execute call.
      // Re-fetch to ensure consistent state (execute sets error via hook).
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

  /** Active templates only, split by channel (for editing in Templates tab). */
  const getActiveTemplatesByChannel = () => {
    const active = templates.filter((t) => t.isActive);
    const inApp = active.filter((t) => t.channel === 'IN_APP');
    const email = active.filter((t) => t.channel === 'EMAIL');
    const order = new Map(ALL_EVENT_TYPES.map((t, i) => [t, i]));
    const sortByEventType = (a: NotificationTemplate, b: NotificationTemplate) =>
      (order.get(a.eventType) ?? 999) - (order.get(b.eventType) ?? 999);
    return {
      inApp: [...inApp].sort(sortByEventType),
      email: [...email].sort(sortByEventType),
    };
  };

  const getTemplatesGroupedByEventTypeForChannel = (
    channelTemplates: NotificationTemplate[]
  ): Record<string, NotificationTemplate[]> => {
    const grouped: Record<string, NotificationTemplate[]> = {};
    channelTemplates.forEach((template) => {
      if (!grouped[template.eventType]) grouped[template.eventType] = [];
      grouped[template.eventType].push(template);
    });
    return grouped;
  };

  const getPriorityBadgeVariant = (priority: NotificationPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'NORMAL':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const { inApp: inAppTemplates, email: emailTemplates } = getActiveTemplatesByChannel();
  const hasAnyActiveTemplates = inAppTemplates.length > 0 || emailTemplates.length > 0;

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

      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">{t('admin.notifications.tabs.channels')}</TabsTrigger>
          <TabsTrigger value="templates">{t('admin.notifications.tabs.templates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.notifications.channels.title')}</CardTitle>
              <CardDescription>
                {t('admin.notifications.channels.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.notifications.channels.table.eventType')}</TableHead>
                    <TableHead className="text-center">
                      {t('admin.notifications.channels.table.inApp')}
                    </TableHead>
                    <TableHead className="text-center">
                      {t('admin.notifications.channels.table.email')}
                    </TableHead>
                    <TableHead>{t('admin.notifications.channels.table.priority')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {t(`admin.notifications.eventTypes.${config.eventType}`)}
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
                          <SelectTrigger className="w-32">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.notifications.templates.title')}</CardTitle>
              <CardDescription>
                {t('admin.notifications.templates.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasAnyActiveTemplates ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.notifications.templates.noActiveTemplates')}
                </div>
              ) : (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      {t('admin.notifications.templates.inAppSection')}
                    </h3>
                    {inAppTemplates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('admin.notifications.templates.noTemplatesForChannel')}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(
                          getTemplatesGroupedByEventTypeForChannel(inAppTemplates)
                        ).map(([eventType, eventTemplates]) => (
                          <div key={`inApp-${eventType}`} className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {t(`admin.notifications.eventTypes.${eventType}`)}
                            </h4>
                            <div className="grid gap-2">
                              {eventTemplates.map((template) => (
                                <div
                                  key={template.id}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <Badge variant="outline" className="text-xs">
                                        {template.locale.toUpperCase()}
                                      </Badge>
                                      <p className="text-sm mt-1 truncate max-w-md">
                                        {template.titleTemplate}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditTemplate(template)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('admin.notifications.templates.emailSection')}
                    </h3>
                    {emailTemplates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('admin.notifications.templates.noTemplatesForChannel')}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(
                          getTemplatesGroupedByEventTypeForChannel(emailTemplates)
                        ).map(([eventType, eventTemplates]) => (
                          <div key={`email-${eventType}`} className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {t(`admin.notifications.eventTypes.${eventType}`)}
                            </h4>
                            <div className="grid gap-2">
                              {eventTemplates.map((template) => (
                                <div
                                  key={template.id}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <Badge variant="outline" className="text-xs">
                                        {template.locale.toUpperCase()}
                                      </Badge>
                                      <p className="text-sm mt-1 truncate max-w-md">
                                        {template.titleTemplate}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditTemplate(template)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
