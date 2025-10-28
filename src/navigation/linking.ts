import type { LinkingOptions } from "@react-navigation/native";
import { screens, type RootParams } from "./routes";

export const linking: LinkingOptions<RootParams> = {
  prefixes: ["myapp://", "https://myapp.example"],
  config: {
    screens: {
      [screens.AuthLogin]: "auth/login",
      [screens.AuthCallback]: "auth/callback",
      [screens.OnboardingQuiz]: "onboarding/quiz",
      [screens.Main]: {
        path: "",
        screens: {
          [screens.Home]: "",
          [screens.WalkCamera]: "scan",
          [screens.WalkStart]: "walk/start",
          [screens.Passport]: "passport",
        },
      },
      [screens.Quests]: "quests",
      [screens.WalkSummary]: "walks/:walkId",
      [screens.Profile]: "u/:userId",
      [screens.PassportListDetail]: "passport/list/:listId?",
      [screens.Search]: "search",
      [screens.Scan]: "scan",
      [screens.ScanCamera]: "scan/camera",
      [screens.ScanContribution]: "scan/contribute",
      [screens.WalkStart]: "walk/start",
      [screens.WalkSetup]: "walk/setup",
      [screens.WalkNav]: "walk/nav",
      [screens.WalkCamera]: "walk/camera",
      [screens.BuildingModule]: "walk/building",
      [screens.BuildingInfo]: "scan/building",
      [screens.NotFound]: "scan/not-found",
      [screens.PastWalksNolli]: "walks/past",
    },
  },
};
