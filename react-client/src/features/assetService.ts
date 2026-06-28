// @ts-ignore
import addOnUISdk from "add-on-ui-sdk";

const PYTHON_SERVER_URL = "http://127.0.0.1:8000";

// --- 1. Real Generation Pipeline ---
export const generateAssetPipeline = async (
    prompt: string, 
    category: string,
    onStatusUpdate: (status: string) => void
): Promise<string> => {
    
    try {
        onStatusUpdate("📡 Connecting to Python Server...");

        const response = await fetch(`${PYTHON_SERVER_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: prompt,
                category: category
            }),
        });

        if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);

        onStatusUpdate("🎨 Processing Asset (SD + Rembg)...");
        
        const imageBlob = await response.blob();
        return URL.createObjectURL(imageBlob);

    } catch (error) {
        console.error("Pipeline failed:", error);
        throw error;
    }
};

// --- 2. Add to Adobe Express Canvas ---
export const addImageToCanvas = async (imageUrl: string) => {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const sdk: any = addOnUISdk || (window as any).addOnUISdk;

        if (!sdk) {
            console.error("❌ SDK not found.");
            return false;
        }

        if (sdk.app && sdk.app.document) {
            await sdk.app.document.addImage(blob);
            return true;
        } else {
            console.error("❌ Document API unavailable.");
            return false;
        }
    } catch (error) {
        console.error("❌ Failed to add image:", error);
        throw error;
    }
};