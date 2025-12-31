import type { BuildingDetail } from "@/constants/passportContent";
import type { NavigatorScreenParams } from "@react-navigation/native";

export const screens = {
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
  WalkNav: "WalkNavScreen",
  BuildingModule: "BuildingModule",
  BuildingInfo: "BuildingInfo",
  RelatedBuildings: "RelatedBuildings",
  SimilarBuildings: "SimilarBuildings",
  NotFound: "NotFound",
  PastWalksNolli: "PastWalksNolli",
  NolliSkia: "NolliSkia",
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
  Quests: { focus?: string } | undefined;
  WalkSummary: {
    walkId: string;
    stats?: {
      totalBuildings: number;
      visitedBuildings: number;
      skippedBuildings: number;
      totalXp: number;
      xpMultiplier: number;
      routeTier: string;
      distance: number;
      duration: number;
    };
    buildings?: (Record<string, unknown> & { visited: boolean })[];
  };
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
  ScanScreen: {
    verificationMode?: boolean;
    expectedBuilding?: {
      bin?: string;
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
    };
    walkId?: string;
    returnScreen?: string;
  } | undefined;
  ContributionScreen: undefined;
  WalkStartScreen: { filters?: WalkFilters } | undefined;
  WalkNavScreen: WalkNavParams;
  BuildingModule: { building: Record<string, unknown> };
  BuildingInfo: {
    buildingData: BuildingDetail;
    skipAestheticTracking?: boolean;
    fromScan?: boolean;
  } | undefined;
  RelatedBuildings: {
    filterType: "architect" | "style" | "materials" | "type" | "use";
    filterValue: string;
    currentLat?: number;
    currentLng?: number;
    excludeBin?: string;
    originBuilding?: string;
  };
  SimilarBuildings: {
    buildingData: BuildingDetail;
  };
  NotFound: {
    message?: string;
    buildingBIN?: string | null;
    position?: { latitude: number; longitude: number } | null;
    capturedPhotoUri?: string | null;
  } | undefined;
  PastWalksNolli: { walkId?: string } | undefined;
  NolliSkia: { walkId?: string } | undefined;
};
