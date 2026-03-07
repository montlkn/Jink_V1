import { awardXp, completeQuest } from "@/services/gateways";
import type { CompleteQuestResult } from "@/services/gateways/supabaseGateway";

type CompleteQuestPayload = {
  userId: string;
  questId: string;
  now?: number;
};

export const questsActions = {
  complete: (payload: CompleteQuestPayload): Promise<CompleteQuestResult> =>
    completeQuest({ now: Date.now(), ...payload }),
  awardXp,
};

export type { CompleteQuestPayload };
