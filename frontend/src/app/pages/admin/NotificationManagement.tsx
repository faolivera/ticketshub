import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { notificationsAdminService } from '@/api/services/notifications-admin.service';
import type {
  NotificationChannelConfig,
  NotificationEventType,
  NotificationPriority,
  NotificationRecipientRole,
} from '@/api/types/notifications';
import { CHANNEL_GROUPS, EVENT_TYPE_RECIPIENTS } from '@/api/types/notifications';

const PRIORITY_OPTIONS: NotificationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const RECIPIENT_STYLES: Record<NotificationRecipientRole, string> = {
  BUYER: 'bg-sky-100 text-sky-700 border-sky-200',
  SELLER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ADMIN: 'bg-violet-100 text-violet-700 border-violet-200',
};

export function NotificationManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchConfigs = useCallback(
    () => notificationsAdminService.getChannelConfigs(),
    [],
  );

  const { data: channelConfigs = [], isLoading, error, execute, setData } = useAsync(fetchConfigs);

  useEffect(() => {
    execute();
  }, [execute]);

  const [updatingConfigKey, setUpdatingConfigKey] = useState<string | null>(null);

  const getConfigForEventType = (eventType: NotificationEventType) =>
    channelConfigs.find((c) => c.eventType === eventType);

  const handleToggleChannel = async (
    config: NotificationChannelConfig,
    channel: 'inApp' | 'email',
  ) => {
    const key = `${config.eventType}-${channel}`;
    const newInApp = channel === 'inApp' ? !config.inAppEnabled : config.inAppEnabled;
    const newEmail = channel === 'email' ? !config.emailEnabled : config.emailEnabled;

    setUpdatingConfigKey(key);
    setData(channelConfigs.map((c) =>
      c.id === config.id ? { ...c, inAppEnabled: newInApp, emailEnabled: newEmail } : c,
    ));

    try {
      await notificationsAdminService.updateChannelConfig(config.eventType, {
        inAppEnabled: newInApp,
        emailEnabled: newEmail,
        priority: config.priority,
      });
      await execute();
    } catch (err) {
      void err;
      setData(channelConfigs.map((c) =>
        c.id === config.id
          ? { ...c, inAppEnabled: config.inAppEnabled, emailEnabled: config.emailEnabled }
          : c,
      ));
    } finally {
      setUpdatingConfigKey(null);
    }
  };

  const handlePriorityChange = async (
    config: NotificationChannelConfig,
    priority: NotificationPriority,
  ) => {
    const key = `${config.eventType}-priority`;
    setUpdatingConfigKey(key);
    setData(channelConfigs.map((c) => (c.id === config.id ? { ...c, priority } : c)));

    try {
      await notificationsAdminService.updateChannelConfig(config.eventType, {
        inAppEnabled: config.inAppEnabled,
        emailEnabled: config.emailEnabled,
        priority,
      });
      await execute();
    } catch (err) {
      void err;
      setData(channelConfigs.map((c) =>
        c.id === config.id ? { ...c, priority: config.priority } : c,
      ));
    } finally {
      setUpdatingConfigKey(null);
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
                <TableHead className="w-24" />
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
                            {(EVENT_TYPE_RECIPIENTS[eventType] ?? []).map((role) => (
                              <span
                                key={role}
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${RECIPIENT_STYLES[role]}`}
                              >
                                {t(`admin.notifications.recipients.${role}`)}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => navigate(`/admin/notifications/${eventType}`)}
                          >
                            {t('admin.notifications.configure')}
                            <ChevronRight className="h-3 w-3" />
                          </Button>
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
    </div>
  );
}
