import { Heart, Users, ShieldCheck } from 'lucide-react'

export function WhyKlasmeyt() {
  return (
    <section className="py-32 bg-[#F8F9FB]">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-semibold text-[#102059] mb-8">
                Why the Community Uses Klasmeyt
              </h2>
              <p className="text-sm text-[#6B7280] mb-12 leading-relaxed">
                Good results in gamefowl breeding come from proper care, reliable supplies, and strong community support. Klasmeyt helps connect enthusiasts, breeders, farmers, and trusted suppliers.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="bg-[#244693] p-3 rounded-lg flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#102059] mb-2">Verified Suppliers</h3>
                    <p className="text-sm text-[#6B7280]">Only trusted agrivet and gamefowl supply stores on the platform</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-[#E20E28] p-3 rounded-lg flex-shrink-0">
                    <Users className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#102059] mb-2">Community-Focused</h3>
                    <p className="text-sm text-[#6B7280]">Built specifically for gamefowl enthusiasts and local stores</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-[#D3A218] p-3 rounded-lg flex-shrink-0">
                    <Heart className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#102059] mb-2">Support Local</h3>
                    <p className="text-sm text-[#6B7280]">Keep your money in the community while getting what you need</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="w-full h-[600px] bg-gray-300 rounded-lg border border-[#E5E7EB]"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
