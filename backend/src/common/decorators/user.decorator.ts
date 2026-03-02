import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUserPublicInfo } from '../../modules/users/users.domain';

export const User = createParamDecorator(
  (
    data: keyof AuthenticatedUserPublicInfo | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUserPublicInfo | AuthenticatedUserPublicInfo[keyof AuthenticatedUserPublicInfo] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserPublicInfo;
    return data ? user[data] : user;
  },
);
