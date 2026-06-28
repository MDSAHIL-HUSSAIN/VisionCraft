import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { scanForText, createPageVariant } from "./features/localization";
import { buildSmartTemplate } from "./features/templateBuilder.js";

const { runtime } = addOnSandboxSdk.instance;

runtime.exposeApi({
  ready: () => true,

  scanText: async () => scanForText(),
  createVariant: async (lang, trans) => await createPageVariant(lang, trans),

  generateTemplate: async (data) => {
    return await buildSmartTemplate(data);
  }
});
