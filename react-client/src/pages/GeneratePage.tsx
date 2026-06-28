import { useState } from 'react'
import { generateAssetPipeline, addImageToCanvas } from '../features/assetService'
import {
  scanCanvasText,
  getTranslations,
  createLocalizedVariants,
} from '../features/localizationService'

const GeneratePage = () => {
  /* ================= Asset Generation ================= */
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('Illustration')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  /* ================= Localization ================= */
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['Hindi'])
  const [isLocalizing, setIsLocalizing] = useState(false)
  const [locStatus, setLocStatus] = useState('')

  const categories = ['Illustration', 'Icon', 'Background Element']

  const languages = [
    "Assamese", "Bengali", "Bodo", "Dogri", 
    "Gujarati", "Hindi", "Kannada", "Kashmiri", 
    "Konkani", "Maithili", "Malayalam", "Manipuri", 
    "Marathi", "Nepali", "Odia", "Punjabi", 
    "Sanskrit", "Santali", "Sindhi", "Tamil", 
    "Telugu", "Urdu"
  ];

  /* ================= Asset Handlers ================= */
  const handleGenerate = async () => {
    if (!prompt) return
    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      const imageUrl = await generateAssetPipeline(
        prompt,
        category,
        (s) => setStatus(s)
      )
      setGeneratedImage(imageUrl)
      setStatus('')
    } catch {
      setStatus('Generation Failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddToCanvas = async () => {
    if (generatedImage) await addImageToCanvas(generatedImage)
  }

  /* ================= Localization Helpers ================= */
  const toggleLanguage = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang]
    )
  }

  const handleLocalizeDesign = async () => {
    if (selectedLangs.length === 0) return

    setIsLocalizing(true)
    setLocStatus('Scanning canvas...')

    try {
      /* 1️⃣ Scan text from canvas */
      const texts = await scanCanvasText()

      if (!texts || texts.length === 0) {
        setLocStatus('No text found to translate.')
        setIsLocalizing(false)
        return
      }

      /* 2️⃣ Translate text */
      setLocStatus(`Translating ${texts.length} text items...`)
      const translations = await getTranslations(texts, selectedLangs)

      /* 3️⃣ Create localized variants */
      setLocStatus('Creating localized variants...')
      await createLocalizedVariants(translations, selectedLangs)

      setLocStatus('Variants created')
    } catch (error) {
      console.error(error)
      setLocStatus('Localization failed')
    } finally {
      setIsLocalizing(false)
    }
  }

  /* ================= UI ================= */
  return (
    <div className="space-y-6">

      {/* ===== Create Asset ===== */}
      <section className="bg-white rounded-2xl border border-[#EAEAEA] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1F2937]">Create Asset</h2>
        <p className="text-sm text-[#6B7280] mb-4">
          Generate visual elements for your design
        </p>

        <button
          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          className="w-full border rounded-xl p-3 text-sm flex justify-between items-center mb-3"
        >
          {category}
        </button>

        {showCategoryDropdown && (
          <div className="border rounded-xl mb-4 overflow-hidden">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c)
                  setShowCategoryDropdown(false)
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Minimal flat illustration of a sale t-shirt"
          className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-[#F26C63] hover:bg-[#E85B53] text-white py-3 rounded-xl font-semibold transition disabled:opacity-60"
        >
          {isGenerating ? 'Generating…' : 'Generate Asset'}
        </button>

        <div className="mt-4 rounded-xl border bg-[#F6F7FB] min-h-[10rem] flex items-center justify-center">
          {generatedImage ? (
            <div className="flex flex-col items-center gap-3">
              <img src={generatedImage} className="h-32 object-contain" />
              <button
                onClick={handleAddToCanvas}
                className="bg-[#F26C63] hover:bg-[#E85B53] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Add to Canvas
              </button>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">
              {status || 'Preview will appear here'}
            </span>
          )}
        </div>
      </section>

      {/* ===== Localization ===== */}
      <section className="bg-white rounded-2xl border border-[#EAEAEA] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#1F2937]">Localization</h2>

        <div className="space-y-2 mb-4">
          {languages.map((lang) => (
            <label key={lang} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedLangs.includes(lang)}
                onChange={() => toggleLanguage(lang)}
              />
              {lang}
            </label>
          ))}
        </div>

        <button
          onClick={handleLocalizeDesign}
          disabled={isLocalizing || selectedLangs.length === 0}
          className="bg-[#F26C63] hover:bg-[#E85B53] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition disabled:opacity-60"
        >
          {isLocalizing ? 'Processing…' : 'Generate Variants'}
        </button>

        {locStatus && (
          <p className="text-center text-sm text-[#5B8CFF] mt-3">
            {locStatus}
          </p>
        )}
      </section>
    </div>
  )
}

export default GeneratePage