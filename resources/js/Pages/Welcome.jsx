import { Head } from '@inertiajs/react'
import { HeroSection } from '../Components/Landing/HeroSection'
import { WhatIsKlasmeyt } from '../Components/Landing/WhatIsKlasmeyt'
import { ForBreeders } from '../Components/Landing/ForBreeders'
import { ForStores } from '../Components/Landing/ForStores'
import { HowItWorks } from '../Components/Landing/HowItWorks'
import { WhyKlasmeyt } from '../Components/Landing/WhyKlasmeyt'
import { CallToAction } from '../Components/Landing/CallToAction'
import { Footer } from '../Components/Landing/Footer'

export default function Welcome() {
  return (
    <>
      <Head title="Klasmeyt - Digital Marketplace for Gamefowl Enthusiasts" />
      <div className="klasmeyt-landing min-h-screen bg-white">
        <HeroSection />
        <WhatIsKlasmeyt />
        <ForBreeders />
        <ForStores />
        <HowItWorks />
        <WhyKlasmeyt />
        <CallToAction />
        <Footer />
      </div>
    </>
  )
}
