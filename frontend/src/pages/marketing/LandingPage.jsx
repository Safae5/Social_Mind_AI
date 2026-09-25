import Navbar from './sections/Navbar'
import Hero from './sections/Hero'
import EcosystemMarquee from './sections/EcosystemMarquee'
import AgentsSection from './sections/AgentsSection'
import FeaturesSection from './sections/FeaturesSection'
import ProductPreview from './sections/ProductPreview'
import PricingSection from './sections/PricingSection'
import FinalCTA from './sections/FinalCTA'
import Footer from './sections/Footer'

export default function LandingPage() {
  return (
    <div className="bg-[#05060a] min-h-screen">
      <Navbar />
      <Hero />
      <EcosystemMarquee />
      <AgentsSection />
      <FeaturesSection />
      <ProductPreview />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}
