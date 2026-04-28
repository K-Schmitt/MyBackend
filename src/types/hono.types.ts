import type { Session, User } from "better-auth";

export type AppVariables = {
  requestId: string;
  session: Session;
  user: User;
};
