import { Link } from '@inertiajs/react'
import primaryLogo from '../../../../Logo/Primary Logo.png'

const navy = '#0B132B'
const pageBg = '#DCDCDC'

export function HomeSection() {
  const navLinkClass =
    'text-[15px] font-medium text-black transition-opacity hover:opacity-70'

  return (
    <section
      id="home"
      className="relative min-h-screen scroll-mt-0 overflow-hidden"
      style={{ backgroundColor: pageBg }}
    >
      <header
        className="fixed inset-x-0 top-0 z-50 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
        style={{ backgroundColor: pageBg }}
      >
        <nav
          className="w-full max-w-none px-6 py-4 sm:px-10 lg:px-14 xl:px-16 2xl:px-20"
          aria-label="Primary"
        >
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <a
              href="#home"
              className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B132B]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#DCDCDC]"
            >
              <img
                src={primaryLogo}
                alt="Klasmeyt"
                className="h-[72px] w-auto max-w-[min(100%,300px)] object-contain object-left sm:h-[100px]"
              />
            </a>

            <div className="flex flex-wrap items-center justify-end gap-6 sm:gap-8 lg:gap-10">
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
          </div>
        </nav>
      </header>

      <div
        className="relative z-10 flex min-h-screen w-full max-w-none flex-col justify-center px-6 pb-28 pt-32 sm:px-10 lg:px-14 lg:pt-28 xl:px-16 2xl:px-20"
        style={{ backgroundColor: pageBg }}
      >
        <div className="w-full max-w-none">
          <div className="max-w-3xl">
            <h1
              className="mb-6 text-3xl font-bold uppercase leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-[2.75rem] lg:leading-tight xl:text-5xl"
              style={{ color: navy , fontWeight: 'bold'}}
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
              <Link href="/register-store">
                <button
                  type="button"
                  className="w-full rounded-[10px] border-2 border-[#0B132B] px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#0B132B] transition-colors hover:bg-white/80 sm:w-auto"
                  style={{ borderRadius: '10px', fontWeight: 'bold', background: 'transparent'}}
                >
                  BE A TRUSTED STORE
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2.5"
          aria-hidden
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#0B132B]" />
          <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm ring-1 ring-[#0B132B]/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm ring-1 ring-[#0B132B]/15" />
        </div>
      </div>
    </section>
  )
}
