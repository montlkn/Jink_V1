import { completeWalk } from "@/services/gateways/supabaseGateway";

type CompleteWalkParams = {
  userId: string;
  walkId: string;
  now?: number;
};

const complete = async (params: CompleteWalkParams) => {
  return completeWalk(params);
};

export const walksActions = { complete };
