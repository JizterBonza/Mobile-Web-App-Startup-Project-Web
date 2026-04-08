import { Check } from 'lucide-react'

export function ForBreeders() {
  const features = [
    'Browse feeds, vitamins, supplements, and conditioning supplies',
    'Order products from multiple stores in one order',
    'Get supplies delivered directly to your location',
    'Discover trusted agrivet and gamefowl supply stores near you',
  ]

  return (
    <section id="for-buyers" className="py-32 bg-[#F8F9FB]">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-xs text-[#E20E28] font-semibold mb-4">For Breeders, Enthusiasts, and Farmers</p>
            <h2 className="text-4xl lg:text-5xl font-semibold text-[#102059] mb-6">
              Find the Supplies You Need
            </h2>
            <p className="text-sm text-[#6B7280] max-w-2xl">
              Whether you&apos;re raising chicks, managing breeding stock, or preparing for conditioning, Klasmeyt helps you find reliable supplies from verified stores.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="w-full h-[500px] bg-gray-300 rounded-lg border border-[#E5E7EB]"></div>
            </div>
            <div>
              <ul className="space-y-6">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="bg-[#E20E28] p-2 rounded flex-shrink-0">
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-[#102059]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
