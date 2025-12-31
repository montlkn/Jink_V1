/**
 * Building Image Service
 *
 * Fetches building images from Cloudflare R2 bucket.
 *
 * Bucket structure:
 * - building-images/{BIN}/{angle}deg_{pitch}pitch.jpg
 * - user-images/{user_id}/{BIN}/{uuid}_{angle}_{timestamp}.jpg
 */

// Cloudflare R2 public URL
const R2_PUBLIC_URL = "https://pub-234fc67c039149b2b46b864a1357763d.r2.dev";

// View types for building images
export type BuildingViewAngle = "0deg" | "90deg" | "180deg" | "270deg";
export type BuildingViewPitch = "0pitch" | "20pitch" | "40pitch";

export interface BuildingImageOptions {
    angle?: BuildingViewAngle;
    pitch?: BuildingViewPitch;
}

/**
 * Get the URL for a building image from Cloudflare R2
 *
 * @param bin - Building Identification Number
 * @param options - View angle and pitch options
 * @returns Full URL to the building image
 *
 * @example
 * getBuildingImageUrl('1000000') // Returns front view (0deg_0pitch)
 * getBuildingImageUrl('1000000', { angle: '90deg', pitch: '20pitch' })
 */
export function getBuildingImageUrl(
    bin: string,
    options: BuildingImageOptions = {},
): string {
    const { angle = "0deg", pitch = "40pitch" } = options;

    if (!bin || bin === "unknown") {
        return "";
    }

    // R2 bucket structure: /{BIN}/{angle}_{pitch}.jpg (no building-images prefix)
    return `${R2_PUBLIC_URL}/${bin}/${angle}_${pitch}.jpg`;
}

/**
 * Get all available view URLs for a building
 *
 * @param bin - Building Identification Number
 * @returns Object with URLs for each view angle
 */
export function getAllBuildingImageUrls(bin: string): Record<string, string> {
    if (!bin || bin === "unknown") {
        return {};
    }

    const angles: BuildingViewAngle[] = ["0deg", "90deg", "180deg", "270deg"];
    const pitches: BuildingViewPitch[] = ["0pitch", "20pitch", "40pitch"];

    const urls: Record<string, string> = {};

    for (const angle of angles) {
        for (const pitch of pitches) {
            const key = `${angle}_${pitch}`;
            urls[key] = getBuildingImageUrl(bin, { angle, pitch });
        }
    }

    return urls;
}

/**
 * Check if a building image exists in R2
 *
 * @param bin - Building Identification Number
 * @param options - View options (defaults to front view)
 * @returns Promise<boolean> - true if image exists
 */
export async function checkBuildingImageExists(
    bin: string,
    options: BuildingImageOptions = {},
): Promise<boolean> {
    const url = getBuildingImageUrl(bin, options);

    if (!url) return false;

    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get the best available image for a building
 * Tries front view first, then other angles if not found
 *
 * @param bin - Building Identification Number
 * @returns URL of best available image, or null if none found
 */
export async function getBestBuildingImage(
    bin: string,
): Promise<string | null> {
    if (!bin || bin === "unknown") return null;

    // Priority order: front view, then sides
    const viewPriority: BuildingImageOptions[] = [
        { angle: "0deg", pitch: "0pitch" }, // Front, straight
        { angle: "0deg", pitch: "20pitch" }, // Front, looking up
        { angle: "90deg", pitch: "0pitch" }, // Left side
        { angle: "270deg", pitch: "0pitch" }, // Right side
        { angle: "0deg", pitch: "40pitch" }, // Front, looking way up
    ];

    for (const options of viewPriority) {
        const exists = await checkBuildingImageExists(bin, options);
        if (exists) {
            return getBuildingImageUrl(bin, options);
        }
    }

    return null;
}

export default {
    getBuildingImageUrl,
    getAllBuildingImageUrls,
    checkBuildingImageExists,
    getBestBuildingImage,
};
