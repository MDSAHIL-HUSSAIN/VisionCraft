import { Mail } from 'lucide-react'

const Header = () => {
  return (
    <div
      className="
        p-5
        text-white
        bg-gradient-to-r
        from-[#FF6A6A]
        via-[#FF9F6B]
        to-[#6EE7E0]
      "
    >
      <div className="flex items-center gap-2">
        <Mail size={22} />
        <h1 className="text-lg font-bold">
          WhatsApp Creative Automation
        </h1>
      </div>
    </div>
  )
}

export default Header
