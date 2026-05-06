import * as ImagePicker from "expo-image-picker";

export const MAX_WARDROBE_IMAGE_BYTES = 10 * 1024 * 1024;

export async function pickWardrobeImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to add wardrobe images.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  validateWardrobeImage(asset);
  return asset;
}

export function validateWardrobeImage(asset: ImagePicker.ImagePickerAsset) {
  const mimeType = asset.mimeType || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error("Choose a JPG, PNG, HEIC, or another supported image file.");
  }
  if (asset.fileSize && asset.fileSize > MAX_WARDROBE_IMAGE_BYTES) {
    throw new Error("Choose an image under 10 MB for reliable mobile upload.");
  }
}

export function imageAssetToFormData(asset: ImagePicker.ImagePickerAsset) {
  validateWardrobeImage(asset);
  const formData = new FormData();
  const filename = asset.fileName || `wardrobe-${Date.now()}.jpg`;
  const mimeType = asset.mimeType || "image/jpeg";

  formData.append("image", {
    uri: asset.uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  return formData;
}
