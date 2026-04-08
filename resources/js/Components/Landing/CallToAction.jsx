import { Apple, Smartphone } from 'lucide-react'
import { Link } from '@inertiajs/react'

export function CallToAction() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20">
            {/* For Buyers */}
            <div>
              <p className="text-xs text-[#E20E28] font-semibold mb-4">
                For Buyers
              </p>
              <h2 className="text-3xl lg:text-4xl font-semibold text-[#102059] mb-6">
                Get the supplies you need—anytime.
              </h2>
              <p className="text-sm text-[#6B7280] mb-8">
                Download the Klasmeyt app and start browsing products from trusted stores.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="py-3 px-6 text-sm font-semibold bg-[#102059] hover:bg-[#244693] text-white rounded-lg transition-colors flex items-center gap-3 justify-center">
                  <Apple className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </button>

                <button className="py-3 px-6 text-sm font-semibold bg-[#102059] hover:bg-[#244693] text-white rounded-lg transition-colors flex items-center gap-3 justify-center">
                  <Smartphone className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs">Get it on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </button>
              </div>
            </div>

            {/* For Store Owners */}
            <div>
              <p className="text-xs text-[#E20E28] font-semibold mb-4">
                For Store Owners
              </p>
              <h2 className="text-3xl font-semibold text-[#102059] mb-4">
                Bring your store online.
              </h2>
              <p className="text-sm text-[#6B7280] mb-8">
                Become a trusted store on Klasmeyt and start reaching more breeders and farmers in your area.
              </p>

              <Link href="/register-store">
                <button className="py-3 px-6 text-sm font-semibold bg-[#E20E28] hover:bg-[#c00d23] text-white rounded-lg transition-colors w-full sm:w-auto">
                  Become a Trusted Store
                </button>
              </Link>

              <div className="mt-12 space-y-4 text-sm text-[#6B7280]">
                <p>• Quick and easy setup</p>
                <p>• Reach customers in your area</p>
                <p>• Manage orders easily</p>
                <p>• No upfront costs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
