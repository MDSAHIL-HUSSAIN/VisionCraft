import { editor, TextAlignment, constants, fonts } from "express-document-sdk";

/* =========================================================================
   1. UTILITIES & CONFIG
   ========================================================================= */

// Map 'Vibes' (from LLM) to available Adobe Express PostScript names
const FONT_MAP = {
    'Bold': ['SourceSans3-Black', 'SourceSans3-Bold'],
    'Modern': ['SourceSans3-Semibold', 'Lato-Regular'],
    'Elegant': ['SourceSans3-Light', 'Lato-Light'],
    'Playful': ['SourceSans3-Black', 'Chewy-Regular'], // Chewy if available, else Source
    'Handwritten': ['SourceSans3-Regular'], // Fallback if no handwriting font guaranteed
    'Traditional': ['SourceSans3-Bold'],
    'Default': ['SourceSans3-Bold']
};

function base64ToBlob(base64) {
    if (!base64 || typeof base64 !== 'string' || base64.length < 100) return null;
    try {
        let raw = base64;
        if (base64.includes("base64,")) raw = base64.split("base64,")[1];
        raw = raw.replace(/[\s\r\n]+/g, "").replace(/-/g, "+").replace(/_/g, "/");
        while (raw.length % 4) raw += "=";
        const b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let output = "";
        let i = 0;
        while (i < raw.length) {
            const enc1 = b64chars.indexOf(raw.charAt(i++));
            const enc2 = b64chars.indexOf(raw.charAt(i++));
            const enc3 = b64chars.indexOf(raw.charAt(i++));
            const enc4 = b64chars.indexOf(raw.charAt(i++));
            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | (enc4);
            output += String.fromCharCode(chr1);
            if (enc3 !== 64) output += String.fromCharCode(chr2);
            if (enc4 !== 64) output += String.fromCharCode(chr3);
        }
        const bytes = new Uint8Array(output.length);
        for (let k = 0; k < output.length; k++) { bytes[k] = output.charCodeAt(k); }
        return new Blob([bytes], { type: "image/png" });
    } catch (e) { console.error("Base64 Error:", e); return null; }
}

// Convert Hex String (#RRGGBB) to Express Color Object (0-1 floats)
function hexToColor(hex) {
    if (!hex || !hex.startsWith('#')) return { red: 0, green: 0, blue: 0, alpha: 1 };
    
    // Remove #
    hex = hex.replace('#', '');
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    return { red: r, green: g, blue: b, alpha: 1 };
}

// Smart Font Loader
async function loadFontByVibe(vibe) {
    const candidates = FONT_MAP[vibe] || FONT_MAP['Default'];
    
    for (const name of candidates) {
        try {
            const font = await fonts.fromPostscriptName(name);
            if (font && font.availableForEditing) {
                console.log(`✅ Loaded font: ${name}`);
                return font;
            }
        } catch (e) {
            console.warn(`Could not load font ${name}`);
        }
    }
    return null; // Fallback to system default if all fail
}

/* =========================================================================
   2. BUILDER LOGIC
   ========================================================================= */

export async function buildSmartTemplate(data) {
    console.log("🏗 Starting Smart Layout Engine...");

    // 1. PRELOAD ASSETS & FONTS (Parallel)
    const bgBlob = base64ToBlob(data.assets?.background);
    const heroBlob = base64ToBlob(data.assets?.hero);
    
    // Get style suggestions from server, or defaults
    const fontVibe = data.plan?.font_vibe || 'Modern';
    const textColorHex = data.plan?.text_color_hex || '#FFFFFF';
    
    const [bgResult, heroResult, primaryFont] = await Promise.all([
        bgBlob ? editor.loadBitmapImage(bgBlob) : Promise.resolve(null),
        heroBlob ? editor.loadBitmapImage(heroBlob) : Promise.resolve(null),
        loadFontByVibe(fontVibe)
    ]);

    // 2. EDIT QUEUE
    await editor.queueAsyncEdit(async () => {
        const page = editor.context.currentPage;
        let artboard = page.artboards.first;
        
        if (!artboard) {
            artboard = editor.createArtboard();
            page.artboards.append(artboard);
        }

        const CANVAS_W = (artboard.width && artboard.width > 0) ? artboard.width : 1080;
        const CANVAS_H = (artboard.height && artboard.height > 0) ? artboard.height : 1350;
        
        // --- BACKGROUND ---
        if (bgResult) {
            const bmpW = bgResult.width;
            const bmpH = bgResult.height;
            const scale = Math.max(CANVAS_W / bmpW, CANVAS_H / bmpH);
            const finalW = bmpW * scale;
            const finalH = bmpH * scale;

            const bg = editor.createImageContainer(bgResult, {
                initialSize: { width: finalW, height: finalH }
            });
            artboard.children.append(bg);
            bg.setPositionInParent(
                { x: (CANVAS_W - finalW) / 2, y: (CANVAS_H - finalH) / 2 }, 
                { x: 0, y: 0 }
            );
        }

        // --- HERO IMAGE ---
        if (heroResult) {
            const hw = heroResult.width;
            const hh = heroResult.height;
            const targetW = CANVAS_W * 0.65;
            const targetH = targetW * (hh / hw);
            
            const hero = editor.createImageContainer(heroResult, {
                initialSize: { width: targetW, height: targetH }
            });
            artboard.children.append(hero);
            hero.setPositionInParent(
                { x: (CANVAS_W - targetW) / 2, y: (CANVAS_H - targetH) / 2 },
                { x: 0, y: 0 }
            );
        }

        // --- TEXT LAYERS (Auto-Height & Dynamic Styles) ---
        const targetColor = hexToColor(textColorHex);

        // HEADLINE
        if (data.plan?.headline) {
            const headline = editor.createText(String(data.plan.headline));
            artboard.children.append(headline);

            // 1. Set Layout to AutoHeight (Fixes overflow)
            headline.layout = {
                type: constants.TextLayout.autoHeight,
                width: CANVAS_W * 0.85 // 85% width
            };

            // 2. Alignment
            headline.textAlignment = constants.TextAlignment.center;

            // 3. Apply Font & Color
            const style = {
                fontSize: 80,
                color: targetColor
            };
            if (primaryFont) style.font = primaryFont;
            
            headline.fullContent.applyCharacterStyles(style);

            // 4. Position (Top Center)
            // Note: We delay slightly or assume immediate calc for bounds
            const textWidth = headline.boundsLocal.width;
            headline.setPositionInParent(
                { x: CANVAS_W / 2, y: CANVAS_H * 0.15 },
                { x: textWidth / 2, y: 0 }
            );
        }

        // BODY TEXT
        if (data.plan?.body_text) {
            const body = editor.createText(String(data.plan.body_text));
            artboard.children.append(body);

            // 1. Set Layout
            body.layout = {
                type: constants.TextLayout.autoHeight,
                width: CANVAS_W * 0.80
            };

            // 2. Alignment
            body.textAlignment = constants.TextAlignment.center;

            // 3. Style (Smaller, maybe lighter version of color)
            const bodyStyle = {
                fontSize: 36,
                color: targetColor // Using same color for consistency
            };
            // Use a standard font for body if the headline font is too display-heavy
            // For now, we reuse the primary font or default
            if (primaryFont) bodyStyle.font = primaryFont;

            body.fullContent.applyCharacterStyles(bodyStyle);

            // 4. Position (Bottom Center)
            const bWidth = body.boundsLocal.width;
            const bHeight = body.boundsLocal.height;
            body.setPositionInParent(
                { x: CANVAS_W / 2, y: CANVAS_H - bHeight - 150 },
                { x: bWidth / 2, y: 0 }
            );
        }
    });

    return true;
}

/* =========================================================================
   3. HELPERS (Keep existing scanning logic)
   ========================================================================= */

const getTextContent = (node) => {
    if (!node) return "";
    return (node.text || node.fullContent?.text || "").trim();
};

const getChildren = (node) => {
    const results = [];
    if (node && node.children) { for (const child of node.children) results.push(child); }
    return results;
};

export function scanForText() {
    const textSet = new Set();
    const stack = [editor.context.currentPage];
    while (stack.length > 0) {
        const node = stack.pop();
        if (!node) continue;
        if (node.type === "Text") {
            const str = getTextContent(node);
            if (str.length > 0) textSet.add(str);
        }
        const kids = getChildren(node);
        for (const child of kids) stack.push(child);
    }
    return Array.from(textSet);
}

export async function createPageVariant(language, translations) {
    const currentPage = editor.context.currentPage;
    if (!currentPage) return "Error";
    try {
        const newPage = currentPage.cloneInPlace();
        const stack = [newPage];
        while(stack.length > 0) {
            const node = stack.pop();
            if(node.type === "Text") {
                const txt = getTextContent(node);
                if(translations[txt]) node.fullContent.text = translations[txt];
            }
            const kids = getChildren(node);
            for(const k of kids) stack.push(k);
        }
        editor.context.currentPage = newPage;
        return "Created";
    } catch(e) { return "Failed"; }
}