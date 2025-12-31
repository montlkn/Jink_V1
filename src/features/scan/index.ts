// Re-export building components
export { TimePeriodSlider } from "@/components/building/TimePeriodSlider";

// Re-export common components
export { ClosePillButton } from "@/components/common/ClosePillButton";
export { BuildingInfoSkeleton } from "@/components/common/SkeletonLoader";

// Re-export building services
export { getBuildingImageUrl } from "@/services/buildingImageService";
export {
    fetchBuildingBySearch,
    fetchRelatedBuildings,
    type BuildingData
} from "@/services/buildingService";
export {
    findSimilarBuildings,
    formatSimilarityScore,
    generateSingleReason,
    getSimilarityColor,
    type SimilarBuilding
} from "@/services/similarBuildingsService";

// Re-export modals
export { LevelUpModal } from "@/components/modals/LevelUpModal";
export { StreakMilestoneModal } from "@/components/modals/StreakMilestoneModal";
export { VisaGrantedModal } from "@/components/modals/VisaGrantedModal";

// Re-export rewards
export { RewardAnimationOverlay } from "@/components/rewards";

// Re-export AI services
export { getLandmarkContext } from "@/services/ai/ragService";

// Re-export gateways
export { createAestheticEvent } from "@/services/gateways/aestheticEventGateway";
export {
    updateStreakWithMilestoneDetection,
    type StreakMilestoneResult
} from "@/services/gateways/streakGateway";
export { checkAndAwardVisas } from "@/services/gateways/visaGateway";
export {
    awardXpWithLevelDetection,
    type LevelUpResult
} from "@/services/gateways/xpGateway";

