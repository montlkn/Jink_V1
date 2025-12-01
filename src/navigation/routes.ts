import type { BuildingDetail } from "@/constants/passportContent";
import type { NavigatorScreenParams } from "@react-navigation/native";

export const screens = {
  Home: "Home",
  Quests: "Quests",
  WalkSummary: "WalkSummary",
  AuthLogin: "Login",
  AuthCallback: "AuthCallback",
  OnboardingQuiz: "OnboardingQuiz",
  QuizResults: "QuizResults",
  Main: "Main",
  Profile: "ProfileDetail",
  Passport: "Passport",
  PassportStamps: "PassportStamps",
  PassportAchievements: "PassportAchievements",
  PassportVisas: "PassportVisas",
  PassportLists: "PassportLists",
  PassportListDetail: "PassportListDetail",
  // Search: "Search", // ARCHIVED for v2 - Search removed for v1 beta
  Scan: "ScanScreen",
  ScanContribution: "ContributionScreen",
  WalkStart: "WalkStartScreen",
  WalkSetup: "WalkSetupScreen",
  WalkNav: "WalkNavScreen",
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

export type MainTabParams = {
  Home: undefined;
  ScanScreen: undefined;
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
  QuizResults: undefined;
  Main: NavigatorScreenParams<MainTabParams> | undefined;
  ProfileDetail: { userId?: string; initialArchetype?: string } | undefined;
  Passport: undefined;
  PassportStamps: undefined;
  PassportAchievements: undefined;
  PassportVisas: undefined;
  PassportLists: undefined;
  PassportListDetail: { listId?: string } | undefined;
  // Search: undefined; // ARCHIVED for v2 - Search removed for v1 beta
  ScanScreen: undefined;
  ContributionScreen: undefined;
  WalkStartScreen: { filters?: WalkFilters } | undefined;
  WalkSetupScreen: undefined;
  WalkNavScreen: WalkNavParams;
  BuildingModule: { building: Record<string, unknown> };
  BuildingInfo: { buildingData: BuildingDetail } | undefined;
  NotFound: { message?: string } | undefined;
  PastWalksNolli: undefined;
};
