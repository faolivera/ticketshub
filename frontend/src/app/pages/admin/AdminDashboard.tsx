import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Calendar, CreditCard, Users, Ticket } from 'lucide-react';

export function AdminDashboard() {
  const { t } = useTranslation();

  const stats = [
    {
      title: t('admin.dashboard.pendingEvents'),
      value: '-',
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      description: t('admin.dashboard.awaitingApproval'),
    },
    {
      title: t('admin.dashboard.pendingPayments'),
      value: '-',
      icon: <CreditCard className="w-5 h-5 text-green-500" />,
      description: t('admin.dashboard.manualApproval'),
    },
    {
      title: t('admin.dashboard.totalUsers'),
      value: '-',
      icon: <Users className="w-5 h-5 text-purple-500" />,
      description: t('admin.dashboard.registeredUsers'),
    },
    {
      title: t('admin.dashboard.activeListings'),
      value: '-',
      icon: <Ticket className="w-5 h-5 text-orange-500" />,
      description: t('admin.dashboard.currentlyActive'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.dashboard.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('admin.dashboard.noRecentActivity')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('admin.dashboard.useNavigation')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;
