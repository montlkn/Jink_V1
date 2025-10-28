type AuthSessionStruct = {
  user: {
    id: string;
    email?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type AuthSession = AuthSessionStruct | null;

export const toAuthSession = (raw: unknown): AuthSession => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const session = raw as Record<string, unknown>;
  const user = session.user && typeof session.user === "object" ? session.user : null;
  return {
    ...session,
    user: user as AuthSessionStruct["user"],
  };
};

export const selectUserId = (session: AuthSession | null): string | null => {
  const user = session?.user;
  return typeof user?.id === "string" ? user.id : null;
};
