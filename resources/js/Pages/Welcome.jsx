import { Head } from '@inertiajs/react'
import { AboutSection } from '../Components/Landing/AboutSection'
import { ContactSection } from '../Components/Landing/ContactSection'
import { FeatureSection } from '../Components/Landing/FeatureSection'
import { HomeSection } from '../Components/Landing/HomeSection'
import { Footer } from '../Components/Landing/Footer'

export default function Welcome() {
  return (
    <>
      <Head title="Klasmeyt - Digital Marketplace for Gamefowl Enthusiasts" />
      <div className="klasmeyt-landing min-h-screen w-full max-w-none bg-white">
        <HomeSection />
        <AboutSection />
        <FeatureSection />
        <ContactSection />
        <Footer />
      </div>
    </>
  )
}
