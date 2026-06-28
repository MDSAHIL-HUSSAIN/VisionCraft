// @ts-ignore
import addOnUISdk from "add-on-ui-sdk";

const PYTHON_SERVER_URL = "http://127.0.0.1:8000";

// --- 1. FETCH DESIGN DATA ---
export const fetchDesignData = async (userMessage: string) => {
    console.log(`🔵 UI: Requesting Design Plan for: "${userMessage}"...`);

    try {
        const response = await fetch(`${PYTHON_SERVER_URL}/process-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const rawData = await response.json();
        console.log("🔵 UI: Received Plan from Backend.");

        // PASS RAW DATA. We will decode Base64 inside the Sandbox.
        // This avoids data corruption during the message passing of binary types.
        return rawData; 

    } catch (e) {
        console.error("❌ UI: Backend Fetch Error:", e);
        throw e;
    }
};

// --- 2. BUILD TEMPLATE (Sandbox) ---
export const buildTemplateInSandbox = async (designData: any) => {
    console.log("🔵 UI: Sending Data to Sandbox...");

    if (!addOnUISdk) {
        console.error("❌ UI: SDK import failed! Check manifest.");
        return;
    }

    try {
        await addOnUISdk.ready;
        const sandbox = await addOnUISdk.instance.runtime.apiProxy("documentSandbox");

        console.log("🔵 UI: Calling sandbox.generateTemplate()...");
        await sandbox.generateTemplate(designData);

        console.log("🔵 UI: Template Build Complete.");
        return true;

    } catch (e) {
        console.error("❌ UI: Sandbox Bridge Error:", e);
        throw e;
    }
};