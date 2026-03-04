import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Inject, Optional } from '@nestjs/common';
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
import type { IRealtimeBroadcaster } from '../../common/realtime';
import { REALTIME_BROADCASTER } from '../realtime/realtime.module';
import { CHAT_MESSAGE } from '../socket/socket.events';

const TRANSACTION_ROOM_PREFIX = 'transaction:';

@Controller('api/transactions/:transactionId/chat')
@UseGuards(JwtAuthGuard)
export class TransactionChatController {
  constructor(
    private readonly transactionChatService: TransactionChatService,
    @Optional()
    @Inject(REALTIME_BROADCASTER)
    private readonly broadcaster: IRealtimeBroadcaster | null,
  ) {}

  @Patch('read')
  async markAsRead(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
  ): Promise<ApiResponse<Record<string, never>>> {
    await this.transactionChatService.markAsRead(ctx, transactionId, user.id);
    return { success: true, data: {} };
  }

  @Get('messages')
  async getMessages(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
    @Query('markRead') markReadQuery?: string,
  ): Promise<ApiResponse<GetTransactionChatMessagesResponse>> {
    const markRead = markReadQuery !== 'false';
    const data = await this.transactionChatService.getMessages(
      ctx,
      transactionId,
      user.id,
      undefined,
      { markRead },
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
    if (this.broadcaster) {
      const roomId = TRANSACTION_ROOM_PREFIX + transactionId;
      await this.broadcaster
        .emitToRoom(roomId, CHAT_MESSAGE, { ...data, transactionId })
        .catch(() => {});
    }
    return { success: true, data };
  }
}
