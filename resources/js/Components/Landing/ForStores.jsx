import { Check } from 'lucide-react'

export function ForStores() {
  const benefits = [
    'List products on the platform',
    'Receive orders from nearby customers',
    'Reach buyers beyond walk-in customers',
    'Grow their business through the platform',
  ]

  return (
    <section id="for-stores" className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <p className="text-xs text-[#E20E28] font-semibold mb-4">
              For Agrivet and Gamefowl Supply Stores
            </p>
            <h2 className="text-4xl lg:text-5xl font-semibold text-[#102059] mb-6">
              Reach More Customers in Your Area
            </h2>
            <p className="text-sm text-[#6B7280] max-w-2xl">
              Klasmeyt helps agrivet and gamefowl supply shops
              bring their products online and connect with more
              customers who prefer buying from trusted local
              stores.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <ul className="space-y-6">
                {benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-4"
                  >
                    <div className="bg-[#E20E28] p-2 rounded flex-shrink-0">
                      <Check
                        className="w-4 h-4 text-white"
                        strokeWidth={3}
                      />
                    </div>
                    <span className="text-sm text-[#102059]">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="w-full h-[500px] bg-gray-300 rounded-lg border border-[#E5E7EB]"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
