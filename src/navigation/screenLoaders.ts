import type { ComponentType } from "react";

type ScreenModule = { default: ComponentType<any> };
type Loader = () => ComponentType<any>;

const createLoader = (load: () => ScreenModule): Loader => () => load().default;

export const ScreenLoaders: Record<string, Loader> = {
  Home: createLoader(() => require("@/screens/Home/HomeScreen")),
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
  WalkSetup: createLoader(() => require("@/screens/Walk/WalkSetupScreen")),
  WalkNav: createLoader(() => require("@/screens/Walk/WalkNavScreen")),
  BuildingModule: createLoader(() => require("@/screens/Walk/BuildingModule")),
  BuildingInfo: createLoader(() =>
    require("@/screens/Scan/BuildingInfoScreen")
  ),
  NotFound: createLoader(() => require("@/screens/Scan/NotFoundScreen")),
  PastWalksNolli: createLoader(() =>
    require("@/screens/PastWalks/PastWalksNolliScreen")
  ),
  OnboardingQuiz: createLoader(() =>
    require("@/screens/Quiz/OnboardingQuizScreen")
  ),
  QuizResults: createLoader(() => require("@/screens/Quiz/QuizResultsScreen")),
};
