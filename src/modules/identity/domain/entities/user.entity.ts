import { randomUUID } from 'node:crypto';

import { UserRole } from '../enums/user-role.enum';

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static registerViewer(email: string, passwordHash: string): User {
    const now = new Date();
    return new User(
      randomUUID(),
      email.trim().toLowerCase(),
      passwordHash,
      UserRole.VIEWER,
      now,
      now,
    );
  }

  static rehydrate(props: {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.role,
      props.createdAt,
      props.updatedAt,
    );
  }
}
