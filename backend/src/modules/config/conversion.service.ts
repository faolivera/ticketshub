import { Injectable, Inject } from '@nestjs/common';
import { PlatformConfigService } from './config.service';
import type { Ctx } from '../../common/types/context';
import type { CurrencyCode } from '../shared/money.domain';
import type { Money } from './config.domain';

/**
 * Converts amounts between currencies using admin-configured exchange rates.
 * Used e.g. to compare seller completed sales (in ARS) with limit (in USD).
 */
@Injectable()
export class ConversionService {
  constructor(
    @Inject(PlatformConfigService)
    private readonly configService: PlatformConfigService,
  ) {}

  /**
   * Convert a money value to the target currency.
   * Uses config.exchangeRates (e.g. usdToArs: 1 USD = N ARS).
   * Amount is in minor units (cents). Result amount is rounded to integer.
   */
  async convert(
    ctx: Ctx,
    money: Money,
    toCurrency: CurrencyCode,
  ): Promise<Money> {
    if (money.currency === toCurrency) {
      return money;
    }
    const config = await this.configService.getPlatformConfig(ctx);
    const { usdToArs } = config.exchangeRates;
    const amountMajor = money.amount / 100;
    let resultMajor: number;
    if (money.currency === 'USD' && toCurrency === 'ARS') {
      resultMajor = amountMajor * usdToArs;
    } else if (money.currency === 'ARS' && toCurrency === 'USD') {
      resultMajor = amountMajor / usdToArs;
    } else {
      // Only USD <-> ARS supported for now; other pairs could be added via config
      throw new Error(
        `Conversion from ${money.currency} to ${toCurrency} is not configured`,
      );
    }
    return {
      amount: Math.round(resultMajor * 100),
      currency: toCurrency,
    };
  }

  /**
   * Sum multiple money values in a target currency.
   * Converts each to the target currency and sums (in minor units).
   */
  async sumInCurrency(
    ctx: Ctx,
    amounts: Money[],
    targetCurrency: CurrencyCode,
  ): Promise<Money> {
    let totalCents = 0;
    for (const m of amounts) {
      const converted = await this.convert(ctx, m, targetCurrency);
      totalCents += converted.amount;
    }
    return { amount: totalCents, currency: targetCurrency };
  }
}
