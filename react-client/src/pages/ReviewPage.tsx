import { useState } from 'react'
import { Send, Image } from 'lucide-react'
import { captureCanvasSnapshot } from '../features/canvasService'

const ReviewPage = () => {
  const [selectedApprover, setSelectedApprover] = useState(
    'Marketing Manager – WhatsApp'
  )
  const [recipientPhone, setRecipientPhone] = useState('918882974474')
  const [showApproverDropdown, setShowApproverDropdown] = useState(false)
  const [canvasPreview, setCanvasPreview] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const approvers = [
    'Marketing Manager – WhatsApp',
    'Product Manager – WhatsApp',
    'Brand Manager – WhatsApp',
  ]

  const handleGeneratePreview = async () => {
    setIsCapturing(true)
    try {
      const img = await captureCanvasSnapshot()
      setCanvasPreview(img)
    } catch {
      alert('Preview failed')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleSend = async () => {
    if (!canvasPreview) return alert('Generate preview first')
    setIsSending(true)
    try {
      const blob = await (await fetch(canvasPreview)).blob()
      const fd = new FormData()
      fd.append('image', blob)
      fd.append('approver', selectedApprover)
      fd.append('recipientPhone', recipientPhone)

      await fetch(
        'https://whatsapp-bot-1lmp.onrender.com/whatsapp/send-design',
        { method: 'POST', body: fd }
      )

      alert('✅ Sent successfully')
    } catch {
      alert('Send failed')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Target */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-bold mb-4">Delivery Target</h2>

        <button
          onClick={() => setShowApproverDropdown(!showApproverDropdown)}
          className="w-full border rounded-lg p-3 text-sm flex justify-between"
        >
          {selectedApprover}
        </button>

        {showApproverDropdown && (
          <div className="border rounded-lg mt-2 overflow-hidden">
            {approvers.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setSelectedApprover(a)
                  setShowApproverDropdown(false)
                }}
                className="w-full text-left p-3 text-sm hover:bg-gray-50"
              >
                {a}
              </button>
            ))}
          </div>
        )}

        <input
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          className="w-full border rounded-lg p-3 text-sm mt-4"
          placeholder="919876543210"
        />
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-bold mb-4">Preview & Deliver</h2>

        <div className="border rounded-xl bg-gray-50 min-h-[16rem] flex items-center justify-center">
          {canvasPreview ? (
            <img src={canvasPreview} className="max-h-80 object-contain" />
          ) : (
            <Image size={56} className="text-gray-300" />
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {/* 🔴 Generate Preview */}
          <button
            onClick={handleGeneratePreview}
            disabled={isCapturing}
            className="
              flex-1
              bg-[#F26C63]
              hover:bg-[#E85B53]
              text-white
              py-3
              rounded-xl
              font-semibold
              transition
              disabled:opacity-60
            "
          >
            {isCapturing ? 'Capturing…' : 'Generate Preview'}
          </button>

          {canvasPreview && (
            /* 🔴 Send to WhatsApp */
            <button
              onClick={handleSend}
              disabled={isSending}
              className="
                flex-1
                bg-[#F26C63]
                hover:bg-[#E85B53]
                text-white
                py-3
                rounded-xl
                font-semibold
                flex
                items-center
                justify-center
                gap-2
                transition
                disabled:opacity-60
              "
            >
              <Send size={18} />
              {isSending ? 'Sending…' : 'Send to WhatsApp'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReviewPage