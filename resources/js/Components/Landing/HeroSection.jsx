import { Link } from '@inertiajs/react'

export function HeroSection() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gray-300"></div>
        <div className="absolute inset-0 bg-[#102059]/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-white">Klasmeyt</div>
            <Link href="/admin" className="text-sm text-white/70 transition-colors hover:text-white">
              Admin Centre
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-6 py-32 lg:py-40 min-h-[calc(100vh-88px)] flex items-center">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-semibold text-white mb-8 leading-tight">
              Trusted Gamefowl Supplies, All in One Place
            </h1>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Klasmeyt connects gamefowl enthusiasts, breeders, and small-scale farmers with trusted agrivet and gamefowl supply stores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="py-3 px-6 text-sm font-semibold bg-[#E20E28] hover:bg-[#c00d23] text-white rounded-lg transition-colors">
                Download App
              </button>
              <Link href="/register-store">
                <button className="py-3 px-6 text-sm font-semibold bg-white hover:bg-[#F8F9FB] text-[#102059] rounded-lg transition-colors">
                  Become a Trusted Store
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
