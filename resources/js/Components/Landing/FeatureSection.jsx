const red = '#FF2D2D'
const navy = '#1A234E'
const sellerSubtitle = '#2E4A9E'

const featureSectionH2Style = {
  color: navy,
  fontWeight: 'bold',
  fontSize: '3.5rem',
}

const buyerFeatures = [
  {
    title: 'Browse Supplies',
    body: 'Find feeds, supplements, and essential supplies for your gamefowl—all in one place.',
  },
  {
    title: 'Trusted Sellers',
    body: 'Order from reliable sellers known by the gamefowl community.',
  },
  {
    title: 'Multi-Store Orders',
    body: 'Buy from different shops and check out in a single order.',
  },
  {
    title: 'Home Delivery',
    body: 'Have your supplies delivered straight to your doorstep, hassle-free.',
  },
]

const sellerFeatures = [
  {
    title: 'Local Market Reach',
    body: 'Connect with nearby gamefowl buyers and boost visibility.',
  },
  {
    title: 'Product Showcase',
    body: 'Display your products online for easy browsing.',
  },
  {
    title: 'Order Management',
    body: 'Handle orders quickly in one place.',
  },
  {
    title: 'Stronger Customer Base',
    body: 'Build loyalty within your local gamefowl community.',
  },
]

function FeatureCard({ title, body, bgColor }) {
  return (
    <div
      className="flex min-h-[160px] flex-col items-center justify-center rounded-[10px] px-5 py-6 text-center sm:min-h-[180px]"
      style={{ backgroundColor: bgColor }}
    >
      <h3 className="text-base font-bold text-white sm:text-lg">{title}</h3>
      <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-white/95 sm:max-w-none sm:text-[15px]">
        {body}
      </p>
    </div>
  )
}

export function FeatureSection() {
  return (
    <section id="feature" className="scroll-mt-20 bg-white py-16 lg:py-24">
      <div className="w-full max-w-none px-6 sm:px-10 lg:px-14 xl:px-16 2xl:px-20">
        {/* Buyers: text left, grid right */}
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16 xl:gap-20">
          <div className="max-w-xl lg:max-w-none">
            <p className="text-base font-bold sm:text-lg" style={{ color: red }}>
              For Breeders, Enthusiasts, and Farmers
            </p>
            <h2
              className="mt-4 uppercase leading-tight tracking-tight"
              style={featureSectionH2Style}
            >
              Find the supplies you need
            </h2>
            <p className="mt-6 text-base leading-relaxed text-gray-600 sm:text-lg">
              Klasmeyt helps you find feeds and supplies from nearby agrivet and gamefowl supply stores. Shop
              across multiple sellers, check out in one order, and have everything delivered to your door when
              available.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {buyerFeatures.map((item) => (
              <FeatureCard key={item.title} title={item.title} body={item.body} bgColor={red} />
            ))}
          </div>
        </div>

        {/* Sellers: text left, grid right (same column pattern as buyers) */}
        <div className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-2 lg:items-center lg:gap-16 xl:gap-20">

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
  {sellerFeatures.map((item) => (
    <FeatureCard key={item.title} title={item.title} body={item.body} bgColor={navy} />
  ))}
</div>
          <div className="max-w-xl lg:max-w-none">
            <p className="text-base font-bold sm:text-lg" style={{ color: sellerSubtitle }}>
              For Agrivet and Gamefowl Supply Stores
            </p>
            <h2
              className="mt-4 uppercase leading-tight tracking-tight"
              style={featureSectionH2Style}
            >
              Sell directly to community
            </h2>
            <p className="mt-6 text-base leading-relaxed text-gray-600 sm:text-lg lg:max-w-xl">
              Connect with buyers in your area, showcase your catalog online, and manage orders in one place—so
              you can grow visibility and loyalty within the local gamefowl community.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
