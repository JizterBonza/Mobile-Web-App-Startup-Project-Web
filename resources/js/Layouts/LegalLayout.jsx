import { Head, Link, usePage } from '@inertiajs/react'
import { Footer } from '../Components/Landing/Footer'
import { LandingHeader } from '../Components/Landing/LandingHeader'

const navy = '#0B132B'

const LEGAL_LINKS = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms and Conditions' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
]

export function LegalSection({ title, children }) {
  return (
    <section className="mt-10 sm:mt-12">
      <h2 className="mb-4 text-xl font-bold sm:text-2xl" style={{ color: navy }}>
        {title}
      </h2>
      <div className="space-y-4 text-base leading-relaxed text-[#0B132B]/80">{children}</div>
    </section>
  )
}

export default function LegalLayout({ title, lastUpdated, children }) {
  const { url } = usePage()
  const currentPath = url.split('?')[0]

  return (
    <>
      <Head title={`${title} | Klasmeyt`} />
      <div className="klasmeyt-landing min-h-screen w-full max-w-none bg-white">
        <LandingHeader
          homeHref="/"
          aboutHref="/#about"
          featureHref="/#feature"
          contactHref="/#contact"
        />

        <main className="px-6 pb-20 pt-36 sm:px-10 sm:pt-40 lg:px-14 lg:pt-44 xl:px-16 2xl:px-20">
          <article className="mx-auto max-w-3xl">
            <p className="text-sm font-medium tracking-wide text-[#0B132B]/60">Legal</p>
            <h1
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
              style={{ color: navy }}
            >
              {title}
            </h1>
            {lastUpdated ? (
              <p className="mt-4 text-sm text-[#0B132B]/60">Last updated: {lastUpdated}</p>
            ) : null}

            {/* <nav
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-black/10 pb-4 text-sm font-medium"
              aria-label="Legal documents"
            >
              {LEGAL_LINKS.map((item) => {
                const isActive = currentPath === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`transition-opacity hover:opacity-70 ${
                      isActive
                        ? 'font-semibold text-[#0B132B] underline underline-offset-4'
                        : 'text-[#0B132B]/70'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav> */}

            <div className="mt-8">{children}</div>
          </article>
        </main>

        <Footer />
      </div>
    </>
  )
}
