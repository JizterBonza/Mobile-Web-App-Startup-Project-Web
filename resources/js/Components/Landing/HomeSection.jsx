import { useEffect, useState } from 'react'
import { Link } from '@inertiajs/react'
import primaryLogo from '../../../../Logo/Primary Logo.png'

const navy = '#0B132B'
const pageBg = '#DCDCDC'

const HERO_SLIDES = [
  '/KlasmeytArtboard 1.jpg',
  '/KlasmeytArtboard 2.jpg',
  '/KlasmeytArtboard 3.jpg',
]

const SLIDE_INTERVAL_MS = 5000

export function HomeSection() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinkClass =
    'text-[15px] font-medium text-black transition-opacity hover:opacity-70'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length)
    }, SLIDE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <section
      id="home"
      className="relative min-h-screen scroll-mt-0 overflow-hidden"
      style={{ backgroundColor: pageBg }}
    >
      <div className="absolute inset-0" aria-hidden>
        {HERO_SLIDES.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === activeSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        ))}
      </div>

      <header
        className="fixed inset-x-0 top-0 z-50 shadow-[0_1px_0_rgba(0,0,0,0)]"
        style={{ backgroundColor: pageBg }}
      >
        <nav
          className="w-full max-w-none px-6 py-4 sm:px-10 lg:px-14 xl:px-16 2xl:px-20"
          aria-label="Primary"
        >
          <div className="flex w-full items-center justify-between">
            <a
              href="#home"
              className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B132B]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#DCDCDC]"
            >
              <img
                src={primaryLogo}
                alt="Klasmeyt"
                className="h-[60px] w-auto max-w-[min(100%,260px)] object-contain object-left sm:h-[80px] lg:h-[100px]"
              />
            </a>

            {/* Desktop nav — hidden on mobile */}
            <div className="hidden items-center gap-6 md:flex lg:gap-10">
              <a href="#about" style={{ color: navy }} className={navLinkClass}>
                About
              </a>
              <a href="#feature" style={{ color: navy }} className={navLinkClass}>
                Features
              </a>
              <a href="#contact" style={{ color: navy }} className={navLinkClass}>
                Contact
              </a>
              <Link
                href="/admin"
                className="rounded-[10px] border border-neutral-300/80 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-sm transition-[box-shadow,background-color] hover:bg-neutral-50 hover:shadow"
              >
                Admin Center
              </Link>
            </div>

            {/* Hamburger button — visible only on mobile */}
            <button
              type="button"
              className="flex flex-col gap-[5px] rounded-md p-2 md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B132B]/30"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span
                className="block h-0.5 w-6 origin-center bg-[#0B132B] transition-transform duration-200"
                style={{ transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }}
              />
              <span
                className="block h-0.5 w-6 bg-[#0B132B] transition-opacity duration-200"
                style={{ opacity: menuOpen ? 0 : 1 }}
              />
              <span
                className="block h-0.5 w-6 origin-center bg-[#0B132B] transition-transform duration-200"
                style={{ transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }}
              />
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {menuOpen && (
            <div className="mt-3 flex flex-col gap-5 border-t border-black/10 pb-3 pt-4 md:hidden">
              <a href="#about" style={{ color: navy }} className={navLinkClass} onClick={() => setMenuOpen(false)}>
                About
              </a>
              <a href="#feature" style={{ color: navy }} className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Features
              </a>
              <a href="#contact" style={{ color: navy }} className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Contact
              </a>
              <Link
                href="/admin"
                className="self-start rounded-[10px] border border-neutral-300/80 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-sm"
                onClick={() => setMenuOpen(false)}
              >
                Admin Center
              </Link>
            </div>
          )}
        </nav>
      </header>

      <div className="relative z-10 flex min-h-screen w-full max-w-none flex-col justify-center px-6 pb-28 pt-32 sm:px-10 lg:px-14 lg:pt-28 xl:px-16 2xl:px-20">
        <div className="w-full max-w-none">
          <div className="max-w-3xl">
            <h1
              className="mb-6 text-3xl font-bold uppercase leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-[2.75rem] lg:leading-tight xl:text-5xl"
              style={{ color: navy, fontWeight: 'bold' }}
            >
              Trusted gamefowl supplies,
              <br />
              all in one place
            </h1>
            <p
              className="mb-10 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: navy }}
            >
              Klasmeyt connects gamefowl enthusiasts, breeders, and small-scale farmers with trusted agrivet
              and gamefowl supply stores.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="rounded-[10px] px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: navy, borderRadius: '10px', fontWeight: 'bold' }}
              >
                DOWNLOAD APP
              </button>
              <a href="#contact">
                <button
                  type="button"
                  className="w-full rounded-[10px] border-2 border-[#0B132B] px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#0B132B] transition-colors hover:bg-white/80 sm:w-auto"
                  style={{ borderRadius: '10px', fontWeight: 'bold', background: 'transparent' }}
                >
                  BE A TRUSTED STORE
                </button>
              </a>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2.5"
          role="tablist"
          aria-label="Hero slides"
        >
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeSlide}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveSlide(index)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index === activeSlide
                  ? 'bg-[#0B132B]'
                  : 'bg-white shadow-sm ring-1 ring-[#0B132B]/15 hover:ring-[#0B132B]/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
