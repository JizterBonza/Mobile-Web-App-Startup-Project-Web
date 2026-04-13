export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 border-t border-gray-100 bg-[#F8F9FB] py-20 lg:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="mb-4 text-3xl font-semibold text-[#102059] sm:text-4xl">Contact</h2>
            <p className="mb-6 text-gray-600 leading-relaxed">
              Questions about partnering as a store, press, or product feedback? Send a note—we read every message.
            </p>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <span className="font-medium text-[#102059]">Email</span>
                <br />
                <a href="mailto:hello@klasmeyt.example" className="text-[#E20E28] hover:underline">
                  hello@klasmeyt.example
                </a>
              </p>
              <p>
                <span className="font-medium text-[#102059]">Hours</span>
                <br />
                Monday–Friday, 9:00–17:00 (local time)
              </p>
            </div>
          </div>
          <form className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm" onSubmit={(e) => e.preventDefault()}>
            <div className="mb-5">
              <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-[#102059]">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#102059]/20 transition-shadow focus:border-[#102059] focus:ring-2"
                placeholder="Your name"
              />
            </div>
            <div className="mb-5">
              <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-[#102059]">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#102059]/20 transition-shadow focus:border-[#102059] focus:ring-2"
                placeholder="you@example.com"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-[#102059]">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                className="w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none ring-[#102059]/20 transition-shadow focus:border-[#102059] focus:ring-2"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#E20E28] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c00d23] sm:w-auto"
            >
              Send message
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
