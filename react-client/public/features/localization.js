import { editor } from "express-document-sdk";

// =========================================================================
// HELPERS
// =========================================================================

const getTextContent = (node) => {
    if (!node) return "";
    let text = "";
    if (typeof node.text === "string") text = node.text;
    else if (typeof node.fullContent === "string") text = node.fullContent;
    else if (node.text && node.text.toString() !== "[object Object]") text = node.text.toString();
    return text.trim();
};

const getChildren = (node) => {
    const results = [];
    if (!node) return results;
    try {
        if (node.children) {
            for (const child of node.children) results.push(child);
        }
    } catch (e) {}
    // Fallback for Linked Lists (older SDK versions)
    if (results.length === 0 && node.first) {
        let curr = node.first;
        while (curr) {
            results.push(curr);
            curr = curr.nextSibling;
        }
    }
    return results;
};

// =========================================================================
// CORE FEATURES
// =========================================================================

/**
 * Scans the current selection or page for translatable text.
 */
export function scanForText() {
    console.log("------------------------------------------");
    console.log("🔍 SANDBOX: Starting Scan...");
    const textSet = new Set();
    const stack = [];

    const selection = editor.context.selection;
    if (selection && selection.length > 0) {
        for (const item of selection) stack.push(item);
    } else {
        const currentPage = editor.context.currentPage;
        // Dig into artboards
        if (currentPage.artboards && currentPage.artboards.length > 0) {
            stack.push(currentPage.artboards.first);
        } else {
            stack.push(currentPage);
        }
    }

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

/**
 * Creates a new page variant using Native Clone or Universal Reconstruction.
 */
export async function createPageVariant(language, translations) {
    console.log(`🎨 WRITER: Creating Global Variant for ${language}...`);
    
    const currentPage = editor.context.currentPage;
    if (!currentPage) return "Error: No Page";

    let newPage = null;
    let strategy = "Unknown";

    // ---------------------------------------------------------------------
    // STRATEGY A: Native Clone (High Fidelity)
    // ---------------------------------------------------------------------
    try {
        console.log("   👉 Attempting Strategy A: page.cloneInPlace()");
        
        if (typeof currentPage.cloneInPlace === 'function') {
            newPage = currentPage.cloneInPlace();
            strategy = "NativeClone";
            console.log(`   ✨ Success! Page Duplicated (ID: ${newPage.id})`);
        } else {
            throw new Error("cloneInPlace API not available");
        }
    } catch (err) {
        console.warn("   ⚠️ Native Clone failed:", err);
        
        // -----------------------------------------------------------------
        // STRATEGY B: Universal Manual Reconstruction (Fallback)
        // -----------------------------------------------------------------
        console.log("   👉 Attempting Strategy B: Universal Reconstruction");
        
        try {
            // 1. Create New Page
            let sourceContainer = currentPage;
            if (currentPage.artboards && currentPage.artboards.length > 0) sourceContainer = currentPage.artboards.first;
            
            const w = sourceContainer.width || 1080;
            const h = sourceContainer.height || 1080;
            newPage = editor.documentRoot.pages.addPage({ width: w, height: h });
            strategy = "UniversalRebuild";

            // 2. Setup Destination
            let destContainer = newPage;
            if (newPage.artboards && newPage.artboards.length > 0) destContainer = newPage.artboards.first;
            else {
                const ab = editor.createArtboard();
                newPage.artboards.append(ab);
                destContainer = ab;
            }

            // 3. Copy Background
            try { if (sourceContainer.fill) destContainer.fill = sourceContainer.fill; } catch(e){}

            // 4. Recursive Copy Function
            const copyNode = (source, parent) => {
                try {
                    let newNode = null;

                    // --- TEXT ---
                    if (source.type === "Text") {
                        const original = getTextContent(source);
                        const content = translations[original] || original;
                        newNode = editor.createText(content);
                        try {
                            if (source.textStyle) {
                                const s = source.textStyle;
                                const style = {};
                                if (s.fontSize) style.fontSize = s.fontSize;
                                if (s.color) style.color = s.color;
                                newNode.textStyle = style;
                            }
                        } catch(e){}
                    }
                    // --- GROUP ---
                    else if (source.type === "Group") {
                        newNode = editor.createGroup();
                        parent.children.append(newNode);
                        const kids = getChildren(source);
                        for (const kid of kids) copyNode(kid, newNode);
                        return; 
                    }
                    // --- IMAGE ---
                    else if (source.type === "MediaContainerNode" || source.type === "Image") {
                        if (source.bitmap) {
                            newNode = editor.createImageContainer(source.bitmap);
                        } else {
                            newNode = editor.createRectangle();
                            newNode.fill = { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 };
                        }
                        if (source.width) newNode.width = source.width;
                        if (source.height) newNode.height = source.height;
                    }
                    // --- RECTANGLE ---
                    else if (source.type === "Rectangle") {
                        newNode = editor.createRectangle();
                        if (source.width) newNode.width = source.width;
                        if (source.height) newNode.height = source.height;
                        try { if (source.fill) newNode.fill = source.fill; } catch(e){}
                        try { if (source.stroke) newNode.stroke = source.stroke; } catch(e){}
                    }
                    // --- ELLIPSE ---
                    else if (source.type === "Ellipse") {
                        newNode = editor.createEllipse();
                        if (source.width) {
                            newNode.rx = source.width / 2;
                            newNode.ry = source.height / 2;
                        }
                        try { if (source.fill) newNode.fill = source.fill; } catch(e){}
                    }

                    // --- APPEND & POSITION ---
                    if (newNode) {
                        parent.children.append(newNode);
                        if (source.translation) newNode.translation = { x: source.translation.x, y: source.translation.y };
                        if (source.rotation) newNode.rotation = source.rotation;
                        if (source.opacity !== undefined) newNode.opacity = source.opacity;
                    }
                } catch (nodeErr) {
                    console.warn(`      Skipped ${source.type}:`, nodeErr);
                }
            };

            // 5. Run Reconstruction
            const rootItems = getChildren(sourceContainer);
            for (const item of rootItems) {
                copyNode(item, destContainer);
            }
            console.log("      ✨ Design Reconstruction Complete.");

        } catch (e) {
            console.error("   ❌ All strategies failed:", e);
            return "Failed";
        }
    }

    // ---------------------------------------------------------------------
    // TRANSLATE (For Native Clone)
    // ---------------------------------------------------------------------
    if (strategy === "NativeClone") {
        let updatedCount = 0;
        const stack = [];
        
        let container = newPage;
        if (newPage.artboards && newPage.artboards.length > 0) container = newPage.artboards.first;

        const kids = getChildren(container);
        for (const k of kids) stack.push(k);

        while (stack.length > 0) {
            const node = stack.pop();
            if (!node) continue;
            
            if (node.type === "Text") {
                try {
                    const original = getTextContent(node);
                    if (original && translations[original]) {
                        node.text = translations[original];
                        updatedCount++;
                    }
                } catch(e){}
            }
            const children = getChildren(node);
            for (const c of children) stack.push(c);
        }
        console.log(`✅ WRITER: Translation updated on cloned page (${updatedCount} items).`);
    }

    try { editor.context.currentPage = newPage; } catch(e) {}
    return "Created";
}