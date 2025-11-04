import type { LinkingOptions } from "@react-navigation/native";
import { screens, type RootParams } from "./routes";

const prefixes = [
  process.env.EXPO_DEEP_LINKING_SCHEME ?? "myapp://",
  process.env.EXPO_PUBLIC_APP_URL ?? "https://myapp.example",
];

export const linking: LinkingOptions<RootParams> = {
  prefixes,
  config: {
    screens: {
      [screens.AuthLogin]: "auth/login",
      [screens.AuthCallback]: "auth/callback",
      [screens.OnboardingQuiz]: "onboarding/quiz",
      [screens.Main]: {
        path: "",
        screens: {
          [screens.Home]: "",
          [screens.WalkCamera]: "walk/camera",
          [screens.WalkStart]: "walk/start",
          [screens.Passport]: "passport",
        },
      },
      [screens.Quests]: "quests",
      [screens.WalkSummary]: "walks/:walkId",
      [screens.Profile]: "u/:userId",
      [screens.PassportStamps]: "passport/stamps",
      [screens.PassportAchievements]: "passport/achievements",
      [screens.PassportVisas]: "passport/visas",
      [screens.PassportLists]: "passport/lists",
      [screens.PassportListDetail]: "passport/list/:listId?",
      [screens.Search]: "search",
      [screens.Scan]: "scan",
      [screens.ScanCamera]: "scan/camera",
      [screens.ScanContribution]: "scan/contribute",
      [screens.WalkSetup]: "walk/setup",
      [screens.WalkNav]: "walk/nav",
      [screens.BuildingModule]: "walk/building",
      [screens.BuildingInfo]: "scan/building",
      [screens.NotFound]: "scan/not-found",
      [screens.PastWalksNolli]: "walks/past",
    },
  },
};
