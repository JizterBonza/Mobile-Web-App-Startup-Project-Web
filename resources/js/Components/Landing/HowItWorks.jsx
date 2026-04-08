import { Search, ShoppingCart, Package, Truck } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: 'Browse Products',
      description:
        'Explore feeds, vitamins, supplements, and other essential supplies from verified stores.',
    },
    {
      icon: ShoppingCart,
      title: 'Add Products to Your Order',
      description: 'Select items from multiple stores in one order.',
    },
    {
      icon: Package,
      title: 'Place Your Order',
      description: 'Confirm your order through the app.',
    },
    {
      icon: Truck,
      title: 'Get Your Supplies Delivered',
      description: 'Your order is prepared and delivered to your location.',
    },
  ]

  return (
    <section id="how-it-works" className="py-32 bg-[#102059]">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-semibold text-white mb-4">
              How Klasmeyt Works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-[#E20E28] text-white mb-6 mx-auto rounded-lg">
                    <StepIcon className="w-8 h-8" strokeWidth={2} />
                  </div>
                  <div className="text-[#D3A218] font-semibold text-xs mb-4">Step {index + 1}</div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
