export type AuthSession = {
  user: {
    id: string;
    email?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
} | null;

export const toAuthSession = (raw: unknown): AuthSession => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const session = raw as Record<string, unknown>;
  const user = session.user && typeof session.user === "object" ? session.user : null;
  return {
    ...session,
    user: user as AuthSession["user"],
  };
};

export const selectUserId = (session: AuthSession): string | null => {
  return session?.user && typeof session.user.id === "string" ? session.user.id : null;
};
