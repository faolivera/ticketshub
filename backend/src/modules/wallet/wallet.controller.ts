import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  GetWalletResponse,
  ListWalletTransactionsResponse,
  WithdrawRequest,
  WithdrawResponse,
} from './wallet.api';

@Controller('api/wallet')
export class WalletController {
  constructor(
    @Inject(WalletService)
    private readonly walletService: WalletService,
  ) {}

  /**
   * Get my wallet
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getWallet(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetWalletResponse>> {
    const wallet = await this.walletService.getBalance(ctx, user.id);
    return { success: true, data: wallet };
  }

  /**
   * Get wallet transactions
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<ListWalletTransactionsResponse>> {
    const transactions = await this.walletService.getTransactions(
      ctx,
      user.id,
    );
    return { success: true, data: transactions };
  }

  /**
   * Request withdrawal
   * Note: In production, this would trigger a payout via payment provider
   */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: WithdrawRequest,
  ): Promise<ApiResponse<WithdrawResponse>> {
    await this.walletService.debitFunds(
      ctx,
      user.id,
      body.amount,
      `withdrawal_${Date.now()}`,
      'Withdrawal request',
    );

    const wallet = await this.walletService.getBalance(ctx, user.id);

    return {
      success: true,
      data: {
        success: true,
        message:
          'Withdrawal request submitted. Funds will be transferred to your bank account.',
        newBalance: wallet.balance,
      },
    };
  }
}
