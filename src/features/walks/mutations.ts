import { completeWalk, fetchNearbyBuildings } from "@/services/gateways";

type CompleteWalkParams = {
  userId: string;
  walkId: string;
  now?: number;
};

const complete = async (params: CompleteWalkParams) => completeWalk(params);

export const walksActions = {
  complete,
  fetchNearbyBuildings,
};
