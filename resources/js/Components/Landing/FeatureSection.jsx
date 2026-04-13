import { Package, ShieldCheck, Store, Truck } from 'lucide-react'

const items = [
  {
    icon: Store,
    title: 'Verified stores',
    description:
      'Listings come from stores you can trust—clear profiles and structured catalog data instead of scattered chats.',
  },
  {
    icon: Package,
    title: 'Unified catalog',
    description:
      'Browse feeds, supplements, and essentials in one flow. Fewer phone trees, fewer “do you have this?” messages.',
  },
  {
    icon: Truck,
    title: 'Flexible fulfillment',
    description:
      'Support the ways your customers already pick up or receive orders, so nothing gets lost between app and counter.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for compliance-minded ops',
    description:
      'Roles and workflows that help teams coordinate—so staff, owners, and partners stay aligned on orders and inventory.',
  },
]

export function FeatureSection() {
  return (
    <section id="feature" className="scroll-mt-20 bg-white py-20 lg:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-semibold text-[#102059] sm:text-4xl">Feature highlights</h2>
          <p className="text-lg text-gray-600">
            Everything on one page—scroll from story to product value without losing context.
          </p>
        </div>
        <ul className="mx-auto mt-14 grid max-w-6xl gap-8 sm:grid-cols-2 lg:gap-10">
          {items.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-5 rounded-2xl border border-gray-100 bg-[#F8F9FB]/80 p-8 transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#102059] text-white">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#102059]">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
