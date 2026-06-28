interface BriefCardProps {
  title: string
  campaign: string
  offer: string
  code: string
  template: string
  onOpenTemplate: () => void
}

const BriefCard = ({
  title,
  campaign,
  template,
  onOpenTemplate,   // ✅ added here
}: BriefCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA]">

      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>

      {/* Campaign */}
      <p className="text-xs text-gray-500 mb-4">
        {campaign}
      </p>

      {/* Button (RIGHT aligned, exact red) */}
      <div className="flex justify-end">
        <button
          onClick={onOpenTemplate}   // ✅ added here
          className="
            bg-[#F26C63]
            hover:bg-[#E85B53]
            text-white
            px-4
            py-2
            rounded-xl
            text-sm
            font-semibold
            shadow
            transition
          "
        >
          Open Template
        </button>
      </div>
    </div>
  )
}

export default BriefCard