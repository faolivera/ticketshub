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
import { notificationsAdminService } from '../../../api/services/notifications-admin.service';
import type {
  NotificationChannelConfig,
  NotificationTemplate,
  NotificationEventType,
  NotificationPriority,
} from '../../../api/types/notifications';
import { TEMPLATE_VARIABLES } from '../../../api/types/notifications';

const PRIORITY_OPTIONS: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function NotificationManagement() {
  const { t } = useTranslation();
  const [channelConfigs, setChannelConfigs] = useState<NotificationChannelConfig[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [configs, templateList] = await Promise.all([
        notificationsAdminService.getChannelConfigs(),
        notificationsAdminService.getTemplates(),
      ]);
      setChannelConfigs(configs);
      setTemplates(templateList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleChannel = async (
    config: NotificationChannelConfig,
    channel: 'inApp' | 'email'
  ) => {
    try {
      const newData = {
        inAppEnabled: channel === 'inApp' ? !config.inAppEnabled : config.inAppEnabled,
        emailEnabled: channel === 'email' ? !config.emailEnabled : config.emailEnabled,
        priority: config.priority,
      };
      await notificationsAdminService.updateChannelConfig(config.eventType, newData);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update channel config');
    }
  };

  const handlePriorityChange = async (
    config: NotificationChannelConfig,
    priority: NotificationPriority
  ) => {
    try {
      await notificationsAdminService.updateChannelConfig(config.eventType, {
        inAppEnabled: config.inAppEnabled,
        emailEnabled: config.emailEnabled,
        priority,
      });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority');
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
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const getTemplatesGroupedByEventType = () => {
    const grouped: Record<NotificationEventType, NotificationTemplate[]> = {} as Record<
      NotificationEventType,
      NotificationTemplate[]
    >;
    templates.forEach((template) => {
      if (!grouped[template.eventType]) {
        grouped[template.eventType] = [];
      }
      grouped[template.eventType].push(template);
    });
    return grouped;
  };

  const getChannelIcon = (channel: 'IN_APP' | 'EMAIL') => {
    return channel === 'IN_APP' ? (
      <Bell className="h-4 w-4" />
    ) : (
      <Mail className="h-4 w-4" />
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const groupedTemplates = getTemplatesGroupedByEventType();

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
                            onCheckedChange={() => handleToggleChannel(config, 'inApp')}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={config.emailEnabled}
                            onCheckedChange={() => handleToggleChannel(config, 'email')}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={config.priority}
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
              {Object.keys(groupedTemplates).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.notifications.templates.noTemplates')}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTemplates).map(([eventType, eventTemplates]) => (
                    <div key={eventType} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        {t(`admin.notifications.eventTypes.${eventType}`)}
                      </h3>
                      <div className="grid gap-2">
                        {eventTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {getChannelIcon(template.channel)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {template.channel === 'IN_APP' ? 'In-App' : 'Email'}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {template.locale.toUpperCase()}
                                  </Badge>
                                  {!template.isActive && (
                                    <Badge variant="secondary" className="text-xs">
                                      {t('common.pending')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate max-w-md">
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
