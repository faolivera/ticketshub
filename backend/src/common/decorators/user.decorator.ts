import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUserPublicInfo } from '../../modules/users/users.domain';


export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUserPublicInfo => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

