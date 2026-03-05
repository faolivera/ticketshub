import { FC } from 'react';
import { ChevronDown, X, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import {
  Drawer, DrawerTrigger, DrawerContent,
  DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose,
} from './ui/drawer';
import { Checkbox } from './ui/checkbox';
import { useIsMobile } from './ui/use-mobile';
import { formatDateTimeShort } from '@/lib/format-date';

export type SortOption = 'price_asc' | 'price_desc' | 'most_available';
export type ViewMode = 'card' | 'list';

interface ShowTimeOption {
  date: string;
  time: string;
  dateObj: Date;
  key: string;
}

interface TicketFiltersProps {
  uniqueShowTimes: ShowTimeOption[];
  uniqueTicketTypes: string[];
  selectedShowTimes: string[];
  selectedTicketTypes: string[];
  onToggleShowTime: (key: string) => void;
  onToggleTicketType: (type: string) => void;
  onClearAll: () => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  displayCount: number;
  totalCount: number;
  acceptsOffersOnly: boolean;
  onAcceptsOffersToggle: () => void;
  hasOfferListings: boolean;
}

export const TicketFilters: FC<TicketFiltersProps> = ({
  uniqueShowTimes,
  uniqueTicketTypes,
  selectedShowTimes,
  selectedTicketTypes,
  onToggleShowTime,
  onToggleTicketType,
  onClearAll,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  displayCount,
  totalCount,
  acceptsOffersOnly,
  onAcceptsOffersToggle,
  hasOfferListings,
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const hasActiveFilters = selectedShowTimes.length > 0 || selectedTicketTypes.length > 0 || acceptsOffersOnly;
  const activeFilterCount = selectedShowTimes.length + selectedTicketTypes.length + (acceptsOffersOnly ? 1 : 0);
  const showDateFilter = uniqueShowTimes.length > 1;
  const showTypeFilter = uniqueTicketTypes.length > 1;

  const showTimeMap = Object.fromEntries(uniqueShowTimes.map(st => [st.key, st]));

  const sortSelect = (
    <select
      value={sortOption}
      onChange={(e) => onSortChange(e.target.value as SortOption)}
      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="price_asc">{t('eventTickets.sortPriceLowToHigh')}</option>
      <option value="price_desc">{t('eventTickets.sortPriceHighToLow')}</option>
      <option value="most_available">{t('eventTickets.sortMostAvailable')}</option>
    </select>
  );

  const viewToggle = (
    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
      <button
        onClick={() => onViewModeChange('card')}
        className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:text-gray-700'}`}
        title={t('eventTickets.viewCards')}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:text-gray-700'}`}
        title={t('eventTickets.viewList')}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );

  const activeChips = hasActiveFilters && (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {selectedShowTimes.map(key => {
        const showTime = showTimeMap[key];
        return (
          <button
            key={key}
            onClick={() => onToggleShowTime(key)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            {showTime ? formatDateTimeShort(showTime.dateObj) : key}
            <X className="w-3 h-3" />
          </button>
        );
      })}
      {selectedTicketTypes.map(type => (
        <button
          key={type}
          onClick={() => onToggleTicketType(type)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          {type}
          <X className="w-3 h-3" />
        </button>
      ))}
      {acceptsOffersOnly && (
        <button
          onClick={onAcceptsOffersToggle}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
        >
          {t('eventTickets.filterAcceptsOffers')}
          <X className="w-3 h-3" />
        </button>
      )}
      <span className="text-xs text-gray-500 ml-1">
        {t('eventTickets.showing', { displayed: displayCount, total: totalCount })}
      </span>
    </div>
  );

  const dateFilterContent = (
    <div className="space-y-1">
      {uniqueShowTimes.map(showTime => (
        <label key={showTime.key} className="flex items-center gap-3 py-1.5 px-1 rounded-md cursor-pointer hover:bg-gray-50">
          <Checkbox
            checked={selectedShowTimes.includes(showTime.key)}
            onCheckedChange={() => onToggleShowTime(showTime.key)}
          />
          <span className="text-sm">{formatDateTimeShort(showTime.dateObj)}</span>
        </label>
      ))}
    </div>
  );

  const typeFilterContent = (
    <div className="space-y-1">
      {uniqueTicketTypes.map(type => (
        <label key={type} className="flex items-center gap-3 py-1.5 px-1 rounded-md cursor-pointer hover:bg-gray-50">
          <Checkbox
            checked={selectedTicketTypes.includes(type)}
            onCheckedChange={() => onToggleTicketType(type)}
          />
          <span className="text-sm">{type}</span>
        </label>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(showDateFilter || showTypeFilter) && (
              <Drawer>
                <DrawerTrigger asChild>
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 transition-colors">
                    <SlidersHorizontal className="w-4 h-4" />
                    {t('eventTickets.filters')}
                    {activeFilterCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>{t('eventTickets.filters')}</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-4 space-y-6 overflow-y-auto">
                    {showDateFilter && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('eventTickets.filterDate')}</h3>
                        {dateFilterContent}
                      </div>
                    )}
                    {showTypeFilter && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('eventTickets.filterType')}</h3>
                        {typeFilterContent}
                      </div>
                    )}
                    {hasOfferListings && (
                      <div>
                        <label className="flex items-center gap-3 py-1.5 px-1 rounded-md cursor-pointer hover:bg-gray-50">
                          <Checkbox
                            checked={acceptsOffersOnly}
                            onCheckedChange={onAcceptsOffersToggle}
                          />
                          <span className="text-sm font-medium">{t('eventTickets.filterAcceptsOffers')}</span>
                        </label>
                      </div>
                    )}
                  </div>
                  <DrawerFooter className="flex-row gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={onClearAll}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t('eventTickets.clearAllFilters')}
                      </button>
                    )}
                    <DrawerClose asChild>
                      <button className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                        {t('eventTickets.applyFilters')}
                      </button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            )}
          </div>
          {sortSelect}
        </div>
        {activeChips}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {showDateFilter && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 transition-colors">
                  {t('eventTickets.filterDate')}
                  {selectedShowTimes.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                      {selectedShowTimes.length}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-[220px]">
                {dateFilterContent}
              </PopoverContent>
            </Popover>
          )}
          {showTypeFilter && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 transition-colors">
                  {t('eventTickets.filterType')}
                  {selectedTicketTypes.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                      {selectedTicketTypes.length}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-[180px]">
                {typeFilterContent}
              </PopoverContent>
            </Popover>
          )}
          {hasOfferListings && (
            <button
              onClick={onAcceptsOffersToggle}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors ${
                acceptsOffersOnly
                  ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {t('eventTickets.filterAcceptsOffers')}
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {t('eventTickets.clearAllFilters')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {viewToggle}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">{t('eventTickets.sortBy')}</label>
            {sortSelect}
          </div>
        </div>
      </div>
      {activeChips}
    </div>
  );
};
