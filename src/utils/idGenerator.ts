import AsyncStorage from "@react-native-async-storage/async-storage";

const ID_STORAGE_KEY = "passport_id_ref";

export const generateIdRef = async (): Promise<string> => {
    try {
        const existingId = await AsyncStorage.getItem(ID_STORAGE_KEY);
        if (existingId) {
            return existingId;
        }

        // Generate a random ID in format DR-XXXX-XXXX
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const segment1 = Array.from(
            { length: 4 },
            () => chars.charAt(Math.floor(Math.random() * chars.length)),
        ).join("");
        const segment2 = Array.from(
            { length: 4 },
            () => chars.charAt(Math.floor(Math.random() * chars.length)),
        ).join("");
        const newId = `DR-${segment1}-${segment2}`;

        await AsyncStorage.setItem(ID_STORAGE_KEY, newId);
        return newId;
    } catch (error) {
        console.error("Failed to generate/retrieve ID Ref:", error);
        return "DR-ERR-0000";
    }
};
