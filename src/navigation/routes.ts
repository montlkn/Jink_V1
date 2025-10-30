import type { NavigatorScreenParams } from "@react-navigation/native";

export const screens = {
  Home: "Home",
  Quests: "Quests",
  WalkSummary: "WalkSummary",
  AuthLogin: "Login",
  AuthCallback: "AuthCallback",
  OnboardingQuiz: "OnboardingQuiz",
  Main: "Main",
  Profile: "ProfileDetail",
  Passport: "Passport",
  PassportListDetail: "PassportListDetail",
  Search: "Search",
  Scan: "ScanScreen",
  ScanCamera: "ScanCamera",
  ScanContribution: "ContributionScreen",
  WalkStart: "WalkStartScreen",
  WalkSetup: "WalkSetupScreen",
  WalkNav: "WalkNavScreen",
  WalkCamera: "WalkCameraScreen",
  BuildingModule: "BuildingModule",
  BuildingInfo: "BuildingInfo",
  NotFound: "NotFound",
  PastWalksNolli: "PastWalksNolli",
  // add screens here as you migrate
} as const;

type WalkLocation = {
  latitude: number;
  longitude: number;
};

type WalkFilters = {
  style_in?: string[];
  architect_in?: string[];
  year_gte?: number;
  year_lte?: number;
};

type MainTabParams = {
  Home: undefined;
  WalkCameraScreen: undefined;
  WalkStartScreen: { filters?: WalkFilters } | undefined;
  Passport: undefined;
};

type WalkNavParams = {
  places: Record<string, unknown>[];
  location: WalkLocation;
  duration?: number;
  durationMinutes?: number;
};

export type RootParams = {
  Home: undefined;
  Quests: { focus?: string } | undefined;
  WalkSummary: { walkId: string };
  Login: undefined;
  AuthCallback: { redirectUrl?: string } | undefined;
  OnboardingQuiz: undefined;
  Main: NavigatorScreenParams<MainTabParams> | undefined;
  ProfileDetail: { userId?: string; initialArchetype?: string } | undefined;
  Passport: undefined;
  PassportListDetail: { listId?: string } | undefined;
  Search: undefined;
  ScanScreen: undefined;
  ScanCamera: undefined;
  ContributionScreen: undefined;
  WalkStartScreen: { filters?: WalkFilters } | undefined;
  WalkSetupScreen: undefined;
  WalkNavScreen: WalkNavParams;
  WalkCameraScreen: { building?: Record<string, unknown> } | undefined;
  BuildingModule: { building: Record<string, unknown> };
  BuildingInfo: { buildingData: Record<string, unknown> } | undefined;
  NotFound: { message?: string } | undefined;
  PastWalksNolli: undefined;
};
