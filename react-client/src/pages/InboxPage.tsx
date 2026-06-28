import { useEffect, useState } from 'react'
import BriefCard from '../components/BriefCard'
import { fetchDesignData, buildTemplateInSandbox } from '../features/pipelineService'

interface Brief {
  id: number
  title: string
  campaign: string
  offer: string
  code: string
  template: string

  // 🔹 Status for template loading
  status: 'new' | 'processing' | 'done' | 'error'
  statusMsg?: string
}

const InboxPage = () => {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ================= FETCH INBOX ================= */
  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await fetch(
          'https://whatsapp-bot-1lmp.onrender.com/whatsapp/inbox'
        )

        if (!res.ok) throw new Error(`API error ${res.status}`)

        const data = await res.json()

        const formatted: Brief[] = data.map((msg: any) => ({
          id: msg.id,
          title: `New Brief (+${msg.from?.slice(-4) || 'XXXX'})`,
          campaign: msg.text || '',
          offer: '-',
          code: '-',
          template: 'AI Auto-Layout',

          // 🔹 default state
          status: 'new',
          statusMsg: 'Ready to generate'
        }))

        setBriefs(formatted)
      } catch (err) {
        console.error(err)
        setError('Failed to load inbox')
      } finally {
        setLoading(false)
      }
    }

    fetchInbox()
  }, [])

  /* ================= STATUS UPDATER ================= */
  const updateBriefStatus = (
    id: number,
    status: Brief['status'],
    msg?: string
  ) => {
    setBriefs(prev =>
      prev.map(b =>
        b.id === id ? { ...b, status, statusMsg: msg } : b
      )
    )
  }

  /* ================= OPEN TEMPLATE PIPELINE ================= */
  const handleGenerateTemplate = async (
    briefId: number,
    userMessage: string
  ) => {
    updateBriefStatus(briefId, 'processing', 'Generating plan & assets...')

    try {
      // 1️⃣ Fetch AI data
      const designData = await fetchDesignData(userMessage)

      updateBriefStatus(briefId, 'processing', 'Building template...')

      // 2️⃣ Build template (slow step)
      await buildTemplateInSandbox(designData)

      // 3️⃣ Done
      updateBriefStatus(briefId, 'done', 'Template Ready')
    } catch (err) {
      console.error(err)
      updateBriefStatus(briefId, 'error', 'Generation failed. Retry?')
    }
  }

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-[#6B7280]">
        Loading inbox…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-sm text-red-500 py-4">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-10">

      {briefs.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-6">
          No messages yet
        </div>
      )}

      {briefs.map((brief) => (
        <div
          key={brief.id}
          className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
        >
          <BriefCard
            title={brief.title}
            campaign={brief.campaign}
            offer={brief.offer}
            code={brief.code}
            template={brief.template}
            onOpenTemplate={() =>
              handleGenerateTemplate(brief.id, brief.campaign)
            }
          />

          {/* 🔹 STATUS TEXT (THIS IS WHAT YOU WANTED) */}
          <div className="mt-3 text-sm font-medium">
            {brief.status === 'processing' && (
              <div className="flex items-center gap-2 text-orange-500">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></span>
                {brief.statusMsg}
              </div>
            )}

            {brief.status === 'done' && (
              <span className="text-green-600">
                {brief.statusMsg}
              </span>
            )}

            {brief.status === 'error' && (
              <span className="text-red-600">
                {brief.statusMsg}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default InboxPage