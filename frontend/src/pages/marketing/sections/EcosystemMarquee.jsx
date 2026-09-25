import instagram from '@/assets/brand-icons/instagram.png'
import facebook  from '@/assets/brand-icons/facebook.png'
import x         from '@/assets/brand-icons/x.png'
import linkedin  from '@/assets/brand-icons/linkedin.png'
import pinterest from '@/assets/brand-icons/pinterest.png'
import tiktok    from '@/assets/brand-icons/tiktok.png'
import youtube   from '@/assets/brand-icons/youtube.png'
import snapchat  from '@/assets/brand-icons/snapchat.png'
import whatsapp  from '@/assets/brand-icons/whatsapp.png'

// Instagram/Facebook/TikTok are the platforms with a real, working OAuth
// integration in the backend today (MetaOAuthController, TikTokOAuthController).
// The rest are shown as the social ecosystem Social Mind AI is built to
// understand — the copy below deliberately doesn't claim live API access
// for all nine, to avoid overstating what's actually wired up.
const PLATFORMS = [
  { name: 'Instagram', icon: instagram },
  { name: 'Facebook',  icon: facebook },
  { name: 'X',         icon: x },
  { name: 'LinkedIn',  icon: linkedin },
  { name: 'Pinterest', icon: pinterest },
  { name: 'TikTok',    icon: tiktok },
  { name: 'YouTube',   icon: youtube },
  { name: 'Snapchat',  icon: snapchat },
  { name: 'WhatsApp',  icon: whatsapp },
]

const TRACK = [...PLATFORMS, ...PLATFORMS] // duplicated for a seamless loop

function Icon({ name, icon }) {
  return (
    <div className="group/icon flex flex-col items-center gap-2 shrink-0 px-6">
      <div className="w-14 h-14 rounded-2xl overflow-hidden transition-transform duration-300 group-hover/icon:scale-110 [filter:drop-shadow(0_0_0_rgba(0,0,0,0))] group-hover/icon:[filter:drop-shadow(0_0_18px_rgba(125,211,252,0.45))]">
        <img src={icon} alt={name} className="w-full h-full object-contain" />
      </div>
      <span className="text-[11px] font-medium text-white/0 group-hover/icon:text-white/60 transition-colors duration-300">
        {name}
      </span>
    </div>
  )
}

export default function EcosystemMarquee() {
  return (
    <section id="platform" className="relative py-20 bg-[#05060a] border-y border-white/[0.06] overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-white/35">
          Built for the platforms driving today's social conversation
        </p>
      </div>

      <div className="relative group">
        {/* Edge fades so the loop doesn't hard-cut at the viewport edge */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#05060a] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#05060a] to-transparent z-10 pointer-events-none" />

        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {TRACK.map((p, i) => (
            <Icon key={`${p.name}-${i}`} name={p.name} icon={p.icon} />
          ))}
        </div>
      </div>
    </section>
  )
}
