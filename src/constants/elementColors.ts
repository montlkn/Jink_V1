import { APP_COLORS } from "./appColors";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

export const ELEMENT_COLORS = {
    streak: {
        active: APP_COLORS.weekly,
        inactive: theme.colors.muted,
        multiplier: APP_COLORS.daily,
        card: APP_COLORS.passport.streak,
    },
    passport: {
        stamps: APP_COLORS.passport.stamp,
        achievements: APP_COLORS.passport.achievement,
        lists: APP_COLORS.passport.list,
        visas: APP_COLORS.passport.visa,
        walks: APP_COLORS.passport.walk,
        bearer: APP_COLORS.passport.bearer,
    },
    status: {
        success: APP_COLORS.success,
        warning: APP_COLORS.warning,
        error: APP_COLORS.error,
    },
};
