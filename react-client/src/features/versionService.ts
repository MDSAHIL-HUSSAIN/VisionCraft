// src/features/versionService.ts

// Adobe Express UI SDK
// @ts-ignore
import addOnUISdk, { RuntimeType } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

/**
 * =====================================
 * BACKEND URL
 * =====================================
 */
const API_BASE_URL =
  "https://manojbadshahversioncontrolserver.onrender.com/api";

/**
 * ===============================
 * TYPES
 * ===============================
 */
export interface DesignVersion {
  id: number;
  versionNumber: number;
  commitMessage: string | null;
  previewUrl: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SaveVersionResult {
  success: boolean;
  version?: DesignVersion;
  error?: string;
}

/**
 * ===============================
 * SAVE NEW VERSION (NETWORK OK)
 * ===============================
 */
export const saveAsNewVersion = async (
  commitMessage?: string
): Promise<SaveVersionResult> => {
  try {
    console.log("💾 Saving new version...");

    // 1️⃣ Export current page as PNG
    const renditions = await addOnUISdk.app.document.createRenditions(
      {
        range: addOnUISdk.constants.Range.currentPage,
        format: addOnUISdk.constants.RenditionFormat.png,
      },
      addOnUISdk.constants.RenditionIntent.export
    );

    if (!renditions?.length) {
      throw new Error("PNG export failed");
    }

    const pngBlob = renditions[0].blob;

    // 2️⃣ Convert PNG → base64
    const base64PNG = await blobToBase64(pngBlob);

    // 3️⃣ Send to backend
    const response = await fetch(`${API_BASE_URL}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commitMessage: commitMessage || "New Version",
        pngBase64: base64PNG,
        createdBy: "designer",
      }),
    });

    if (!response.ok) {
      throw new Error("Backend failed to save version");
    }

    const savedVersion: DesignVersion = await response.json();

    console.log("✅ Version saved:", savedVersion);

    return { success: true, version: savedVersion };
  } catch (error) {
    console.error("❌ Save version failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * ===============================
 * LOAD VERSION HISTORY (NETWORK OK)
 * ===============================
 */
export const loadVersionHistory = async (): Promise<DesignVersion[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/versions`);

    if (!response.ok) {
      throw new Error("Failed to fetch versions");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ loadVersionHistory failed:", error);
    return [];
  }
};

/**
 * ===============================
 * RESTORE VERSION (NO BACKEND)
 * ===============================
 * ❗ Adobe Express rule:
 * ❗ Restore must NOT depend on network
 */
export const restoreVersionToCanvas = async (
  version: DesignVersion
): Promise<boolean> => {
  try {
    console.log(`🔄 Restoring V${version.versionNumber}`);

    if (!version.previewUrl) {
      throw new Error("previewUrl missing");
    }

    // 1️⃣ Load image directly (S3 public URL – allowed)
    const imageBlob = await fetchImageBlob(version.previewUrl);

    // 2️⃣ Import into document sandbox
    const { runtime } = addOnUISdk.instance;
    const sandbox = await runtime.apiProxy(RuntimeType.documentSandbox);

    const result = await sandbox.importImageWithPageResize(imageBlob);

    if (!result?.success) {
      throw new Error(result?.error || "Import failed");
    }

    console.log("✅ Restore successful");
    return true;
  } catch (error) {
    console.error("❌ Restore failed:", error);
    return false;
  }
};

/**
 * ===============================
 * DELETE VERSION
 * ===============================
 */
export const deleteVersion = async (
  versionNumber: number
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/versions/${versionNumber}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    return true;
  } catch (error) {
    console.error("❌ Delete failed:", error);
    return false;
  }
};

/**
 * ===============================
 * HELPERS
 * ===============================
 */
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const fetchImageBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load preview image");
  }
  return await response.blob();
};
