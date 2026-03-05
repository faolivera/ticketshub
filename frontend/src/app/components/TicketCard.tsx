import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Award, Link2, MessageCircle, ShieldCheck, Tag, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from './UserAvatar';
import { formatCurrencyFromUnits } from '@/lib/format-currency';

export interface ShowTime {
  date: string;
  time: string;
  dateObj: Date;
  eventDateId: string;
}

export interface SellerReviews {
  positive: number;
  neutral: number;
  negative: number;
}

export interface TransformedTicket {
  id: string;
  type: string;
  price: number;
  currency: string;
  available: number;
  sellTogether: boolean;
  acceptsOffers: boolean;
  commissionPercentRange: { min: number; max: number };
  seller: string;
  sellerName: string;
  sellerPicture?: string;
  sellerReviews: SellerReviews;
  sellerBadges: Array<'trusted' | 'verified' | 'best_seller'>;
  sellerTotalSales: number;
  showTime: ShowTime;
}

type BadgeType = 'trusted' | 'verified' | 'best_seller';

const getBadgeIcon = (badge: BadgeType) => {
  switch (badge) {
    case 'trusted':
      return <ShieldCheck className="w-4 h-4" />;
    case 'verified':
      return <Award className="w-4 h-4" />;
    case 'best_seller':
      return <Trophy className="w-4 h-4" />;
  }
};

const getBadgeColor = (badge: BadgeType) => {
  switch (badge) {
    case 'trusted':
      return 'bg-blue-100 text-blue-700';
    case 'verified':
      return 'bg-green-100 text-green-700';
    case 'best_seller':
      return 'bg-purple-100 text-purple-700';
  }
};

const getBadgeLabel = (badge: BadgeType, t: (key: string) => string) => {
  switch (badge) {
    case 'trusted':
      return t('eventTickets.badgeTrusted');
    case 'verified':
      return t('eventTickets.badgeVerified');
    case 'best_seller':
      return t('eventTickets.badgeBestSeller');
  }
};

interface TicketCardProps {
  ticket: TransformedTicket;
  isBestPrice?: boolean;
  variant?: 'card' | 'list';
}

export const TicketCard: FC<TicketCardProps> = ({ ticket, isBestPrice = false, variant = 'card' }) => {
  const { t } = useTranslation();

  const renderSellerStatus = () => {
    const { sellerReviews, sellerBadges } = ticket;
    const totalReviews = sellerReviews.positive + sellerReviews.neutral + sellerReviews.negative;

    if (totalReviews === 0 && sellerBadges.length === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {t('eventTickets.newSeller')}
        </span>
      );
    }

    const positivePercentage = totalReviews > 0
      ? Math.round((sellerReviews.positive / totalReviews) * 100)
      : 0;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {totalReviews > 0 && (
          <span className="text-xs text-gray-600">
            {t('eventTickets.positiveReviews', { percent: positivePercentage, total: totalReviews })}
          </span>
        )}
        {sellerBadges.map((badge) => (
          <span
            key={badge}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium ${getBadgeColor(badge)}`}
          >
            {getBadgeIcon(badge)}
            {getBadgeLabel(badge, t)}
          </span>
        ))}
      </div>
    );
  };

  const formattedPrice = formatCurrencyFromUnits(ticket.price, ticket.currency);

  const commissionText = ticket.commissionPercentRange.min === ticket.commissionPercentRange.max
    ? t('eventTickets.buyerFeeAtCheckout', { percent: ticket.commissionPercentRange.min })
    : t('eventTickets.buyerFeeUpToAtCheckout', { percent: ticket.commissionPercentRange.max });

  const badgesRow = (isBestPrice || ticket.acceptsOffers) && (
    <div className="flex items-center gap-1.5 mt-1.5">
      {isBestPrice && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <Tag className="w-3 h-3" />
          {t('eventTickets.bestPrice')}
        </span>
      )}
      {ticket.acceptsOffers && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <MessageCircle className="w-3 h-3" />
          {t('eventTickets.acceptsOffers')}
        </span>
      )}
    </div>
  );

  const availabilityContent = ticket.available === 1 ? (
    <span className="text-amber-600 font-semibold">{t('eventTickets.lastTicket')}</span>
  ) : (
    <>
      {t('eventTickets.ticketsAvailable', { count: ticket.available })}
      <span className="text-gray-400 mx-1">·</span>
      {ticket.sellTogether ? (
        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
          <Link2 className="w-3.5 h-3.5" />
          {t('eventTickets.mustBuyAllTogether')}
        </span>
      ) : (
        <span className="text-gray-500">{t('eventTickets.buyOneOrMore')}</span>
      )}
    </>
  );

  if (variant === 'list') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">{ticket.type}</span>
            {isBestPrice && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 shrink-0">
                <Tag className="w-3 h-3" />
                {t('eventTickets.bestPrice')}
              </span>
            )}
            {ticket.acceptsOffers && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                <MessageCircle className="w-3 h-3" />
                {t('eventTickets.acceptsOffers')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <UserAvatar name={ticket.sellerName} src={ticket.sellerPicture} className="h-5 w-5" />
            <span className="text-xs text-gray-500 truncate max-w-[120px]">{ticket.sellerName}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">
              {ticket.available === 1 ? (
                <span className="text-amber-600 font-semibold">{t('eventTickets.lastTicket')}</span>
              ) : (
                t('eventTickets.ticketsAvailable', { count: ticket.available })
              )}
            </span>
          </div>
        </div>
        <p className="text-lg font-bold text-gray-900 whitespace-nowrap shrink-0">{formattedPrice}</p>
        <Link
          to={`/buy/${ticket.id}`}
          className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('eventTickets.buyTicket')}
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors flex flex-col">
      {/* Type + Price — always first for consistent scanning */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-lg font-bold text-gray-900">{ticket.type}</h4>
        <p className="text-2xl font-bold text-gray-900 whitespace-nowrap">
          {formattedPrice}
        </p>
      </div>

      {/* Availability + urgency */}
      <p className="text-sm text-gray-600">{availabilityContent}</p>

      {/* Badges below availability */}
      <div className="mb-4">{badgesRow}</div>

      {/* Seller + CTA — pushed to bottom */}
      <div className="border-t border-gray-200 pt-3 mt-auto">
        <div className="flex items-center gap-2 mb-3">
          <UserAvatar name={ticket.sellerName} src={ticket.sellerPicture} className="h-8 w-8" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/seller/${ticket.seller}`}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 truncate"
              >
                {ticket.sellerName}
              </Link>
              {renderSellerStatus()}
            </div>
            {ticket.sellerTotalSales > 0 && (
              <p className="text-xs text-gray-500">
                {t('eventTickets.ticketsSold', { count: ticket.sellerTotalSales })}
              </p>
            )}
          </div>
        </div>

        <Link
          to={`/buy/${ticket.id}`}
          className="block w-full px-4 py-3 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('eventTickets.buyTicketForPrice', { price: formattedPrice })}
        </Link>

        {/* Buyer fee + platform trust */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">{commissionText}</p>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('eventTickets.buyerProtection')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
