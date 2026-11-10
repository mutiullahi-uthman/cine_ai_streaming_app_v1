import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { UserRole } from '../../domain/enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
