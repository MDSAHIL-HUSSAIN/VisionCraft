// @ts-ignore
import addOnUISdk from "add-on-ui-sdk";

export const captureCanvasSnapshot = async (): Promise<string | null> => {
    console.log("🔵 Starting canvas capture...");

    try {
        // Wait for SDK to be ready
        if (addOnUISdk && addOnUISdk.ready) {
            await addOnUISdk.ready;
        }

        // Get SDK reference
        const sdk = addOnUISdk || (window as any).addOnUISdk;
        
        if (!sdk) {
            console.error("❌ SDK not available");
            return null;
        }

        console.log("✅ SDK ready, creating renditions...");

        // Create rendition of current page
        const renditions = await sdk.app.document.createRenditions({
            range: "currentPage",
            format: "image/png"
        });

        console.log("📸 Renditions created:", renditions);

        if (!renditions || renditions.length === 0) {
            console.error("❌ No renditions returned");
            return null;
        }

        const blob = renditions[0].blob;
        console.log("📦 Blob received, size:", blob.size);

        // Convert blob to base64
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                const result = reader.result as string;
                console.log("✅ Converted to base64");
                resolve(result);
            };
            
            reader.onerror = () => {
                console.error("❌ FileReader error");
                reject(reader.error);
            };
            
            reader.readAsDataURL(blob);
        });

        return base64;

    } catch (error) {
        console.error("❌ Canvas capture failed:", error);
        return null;
    }
};