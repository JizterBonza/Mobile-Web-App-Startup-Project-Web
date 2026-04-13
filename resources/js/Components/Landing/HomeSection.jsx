import { Link } from '@inertiajs/react'

const navy = '#0B132B'
const pageBg = '#DCDCDC'

function RoosterMark({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 48"
      width="44"
      height="38"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#E20E28"
        d="M28 2c-.8 0-1.6.4-2 1.1l-2.2 4.5-1.8-2.4c-.7-.9-2-.9-2.8-.2s-.9 2-.2 2.8l2.4 3.1-3.6-.5c-1.1-.2-2.1.5-2.3 1.6s.5 2.1 1.6 2.3l4 .6c-2.2 1.8-3.6 4.5-3.6 7.6 0 2.6 1 5 2.7 6.8l-1.2 6.8c-.2 1.1.5 2.1 1.6 2.3h.4c1 0 1.8-.7 2-1.7l.9-5.2h2.8l.9 5.2c.2 1 1 1.7 2 1.7 1.1-.2 1.8-1.2 1.6-2.3l-1.2-6.8c1.7-1.8 2.7-4.2 2.7-6.8 0-3.1-1.4-5.8-3.6-7.6l4-.6c1.1-.2 1.8-1.2 1.6-2.3s-1.2-1.8-2.3-1.6l-3.6.5 2.4-3.1c.7-.9.5-2.1-.2-2.8s-2.1-.7-2.8.2l-1.8 2.4-2.2-4.5c-.4-.7-1.2-1.1-2-1.1Z"
      />
      <ellipse cx="28" cy="34" rx="11" ry="7" fill="#E20E28" />
    </svg>
  )
}

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
          className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-4 sm:px-10 lg:px-14"
          aria-label="Primary"
        >
          <a
            href="#home"
            className="shrink-0 flex flex-col items-start gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B132B]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#DCDCDC]"
          >
            <RoosterMark className="shrink-0" />
            <span
              className="text-lg font-bold uppercase leading-none tracking-wide sm:text-xl"
              style={{ color: navy }}
            >
              KLASMEYT
            </span>
          </a>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-6 sm:gap-8 lg:gap-10">
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
              Admin Centre
            </Link>
          </div>
        </nav>
      </header>

      <div
        className="relative z-10 flex min-h-screen flex-col justify-center px-8 pb-28 pt-32 sm:px-12 lg:px-16 lg:pt-28"
        style={{ backgroundColor: pageBg }}
      >
        <div className="mx-auto w-full max-w-[1400px]">
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
