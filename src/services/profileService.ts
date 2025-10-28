import {
  getProfile as gatewayGetProfile,
  updateProfile as gatewayUpdateProfile,
  uploadAvatar as gatewayUploadAvatar,
} from "@/services/gateways/supabaseGateway";
import type { RawProfile } from "@/features/profile";

export type ProfileUpdateInput = {
  userId: string;
  patch: {
    full_name?: string | null;
    username?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
  };
};

export type ProfileUpdateResult = RawProfile;

export type UploadAvatarParams = {
  userId: string;
  file: {
    uri: string;
    name: string;
    type?: string;
  };
};

export type UploadAvatarResult = {
  publicUrl: string;
  path: string;
};

export async function fetchProfile(userId: string): Promise<RawProfile | null> {
  return gatewayGetProfile(userId);
}

export async function updateProfile(params: ProfileUpdateInput): Promise<ProfileUpdateResult> {
  return gatewayUpdateProfile(params);
}

export async function uploadAvatar(
  params: UploadAvatarParams
): Promise<UploadAvatarResult> {
  return gatewayUploadAvatar(params);
}
