import type { ComponentType } from "react";

type ScreenModule = { default: ComponentType<any> };
type Loader = () => ComponentType<any>;

const createLoader = (load: () => ScreenModule): Loader => () => load().default;

export const ScreenLoaders: Record<string, Loader> = {
  Quests: createLoader(() => require("@/screens/Quests/QuestsScreen")),
  WalkSummary: createLoader(() => require("@/screens/Walk/WalkSummaryScreen")),
  Profile: createLoader(() => require("@/screens/Profile/ProfileScreen")),
  Passport: createLoader(() => require("@/screens/Passport/PassportScreen")),
  PassportStamps: createLoader(() =>
    require("@/screens/Passport/StampsScreen")
  ),
  PassportAchievements: createLoader(() =>
    require("@/screens/Passport/AchievementsScreen")
  ),
  PassportVisas: createLoader(() => require("@/screens/Passport/VisasScreen")),
  PassportLists: createLoader(() => require("@/screens/Passport/ListsScreen")),
  PassportListDetail: createLoader(() =>
    require("@/screens/Passport/ListDetailScreen")
  ),
  // Search: createLoader(() => require("@/screens/Search/SearchScreen")), // ARCHIVED for v2 - Search removed for v1 beta
  Scan: createLoader(() => require("@/screens/Scan/ScanScreen")),
  ScanContribution: createLoader(() =>
    require("@/screens/Scan/ContributionScreen")
  ),
  WalkStart: createLoader(() => require("@/screens/Walk/WalkStartScreen")),
  WalkNav: createLoader(() => require("@/screens/Walk/WalkNavScreen")),
  BuildingModule: createLoader(() => require("@/screens/Walk/BuildingModule")),
  BuildingInfo: createLoader(() =>
    require("@/screens/Scan/BuildingInfoScreen")
  ),
  RelatedBuildings: createLoader(() =>
    require("@/screens/Scan/RelatedBuildingsScreen")
  ),
  SimilarBuildings: createLoader(() =>
    require("@/screens/Scan/SimilarBuildingsScreen")
  ),
  NotFound: createLoader(() => require("@/screens/Scan/NotFoundScreen")),
  PastWalksNolli: createLoader(() =>
    require("@/screens/PastWalks/NolliMapScreen")
  ),
  OnboardingQuiz: createLoader(() =>
    require("@/screens/Quiz/OnboardingQuizScreen")
  ),
  NolliSkia: createLoader(() => require("@/screens/PastWalks/NolliMapScreen")),
  QuizResults: createLoader(() => require("@/screens/Quiz/QuizResultsScreen")),
};
