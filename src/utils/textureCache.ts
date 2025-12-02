/**
 * Global texture cache for Three.js textures
 * Keeps textures in memory to avoid reloading on component remount
 */

import { Texture } from "three";

const textureCache = new Map<string, Texture>();

export function getCachedTexture(key: string): Texture | null {
    return textureCache.get(key) || null;
}

export function setCachedTexture(key: string, texture: Texture): void {
    textureCache.set(key, texture);
}

export function clearTextureCache(): void {
    textureCache.forEach((texture) => {
        texture.dispose();
    });
    textureCache.clear();
}

export function getTextureCacheSize(): number {
    return textureCache.size;
}
