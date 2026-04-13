export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-gray-100 bg-[#F8F9FB] py-20 lg:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-semibold text-[#102059] sm:text-4xl">About Klasmeyt</h2>
          <p className="mb-6 text-lg text-gray-600">
            We built Klasmeyt so breeders and small-scale farmers can source feed, medicine, and supplies
            without guessing who to trust.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-2 md:gap-12">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-[#102059]">Our mission</h3>
            <p className="text-gray-600 leading-relaxed">
              Make it simple to find reputable stores, compare what you need, and keep your flock healthy—with clear
              information and a marketplace designed for how you already work.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-[#102059]">Who we serve</h3>
            <p className="text-gray-600 leading-relaxed">
              Enthusiasts ordering for home setups, breeders scaling operations, and local stores that want to reach
              serious buyers online—without losing the personal touch of their shop.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
