import {
  updateProfile as gatewayUpdateProfile,
  uploadAvatar as gatewayUploadAvatar,
} from "@/services/profileService";
import type {
  ProfileUpdateInput,
  UploadAvatarParams,
  ProfileUpdateResult,
  UploadAvatarResult,
} from "@/services/profileService";

export const profileMutations = {
  async updateProfile(params: ProfileUpdateInput): Promise<ProfileUpdateResult> {
    return gatewayUpdateProfile(params);
  },
  async uploadAvatar(params: UploadAvatarParams): Promise<UploadAvatarResult> {
    return gatewayUploadAvatar(params);
  },
};
