import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  GetTransactionChatMessagesResponse,
  PostTransactionChatMessageRequest,
  PostTransactionChatMessageResponse,
} from './transaction-chat.api';
import { TransactionChatService } from './transaction-chat.service';

@Controller('api/transactions/:transactionId/chat')
@UseGuards(JwtAuthGuard)
export class TransactionChatController {
  constructor(
    private readonly transactionChatService: TransactionChatService,
  ) {}

  @Get('messages')
  async getMessages(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
  ): Promise<ApiResponse<GetTransactionChatMessagesResponse>> {
    const data = await this.transactionChatService.getMessages(
      ctx,
      transactionId,
      user.id,
    );
    return { success: true, data };
  }

  @Post('messages')
  async sendMessage(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
    @Body() body: PostTransactionChatMessageRequest,
  ): Promise<ApiResponse<PostTransactionChatMessageResponse>> {
    const data = await this.transactionChatService.sendMessage(
      ctx,
      transactionId,
      user.id,
      body.content,
    );
    return { success: true, data };
  }
}
