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
  PassportListDetail: createLoader(() => require("@/screens/Passport/ListDetailScreen")),
  Search: createLoader(() => require("@/screens/Search/SearchScreen")),
  Scan: createLoader(() => require("@/screens/Scan/ScanScreen")),
  ScanCamera: createLoader(() => require("@/screens/Scan/CameraScreen")),
  ScanContribution: createLoader(() => require("@/screens/Scan/ContributionScreen")),
  WalkStart: createLoader(() => require("@/screens/Walk/WalkStartScreen")),
  WalkSetup: createLoader(() => require("@/screens/Walk/WalkSetupScreen")),
  WalkNav: createLoader(() => require("@/screens/Walk/WalkNavScreen")),
  WalkCamera: createLoader(() => require("@/screens/Walk/WalkCameraScreen")),
  BuildingModule: createLoader(() => require("@/screens/Walk/BuildingModule")),
  BuildingInfo: createLoader(() => require("@/screens/Scan/BuildingInfoScreen")),
  NotFound: createLoader(() => require("@/screens/Scan/NotFoundScreen")),
  PastWalksNolli: createLoader(() => require("@/screens/PastWalks/PastWalksNolliScreen")),
  OnboardingQuiz: createLoader(() => require("@/screens/Quiz/OnboardingQuizScreen")),
};
