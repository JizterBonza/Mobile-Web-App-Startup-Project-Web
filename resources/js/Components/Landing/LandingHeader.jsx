import { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import primaryLogo from '../../../../Logo/Primary Logo.png'

const navy = '#0B132B'
const pageBg = '#DCDCDC'

export function LandingHeader({
  homeHref = '#home',
  aboutHref = '#about',
  featureHref = '#feature',
  contactHref = '#contact',
}) {
  const { auth } = usePage().props
  const [menuOpen, setMenuOpen] = useState(false)
  const canAccessKlasrum = ['super_admin', 'admin'].includes(auth?.user?.user_type)

  const navLinkClass =
    'text-[15px] font-medium text-black transition-opacity hover:opacity-70'

  return (
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
            href={homeHref}
            className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B132B]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#DCDCDC]"
          >
            <img
              src={primaryLogo}
              alt="Klasmeyt"
              className="h-[60px] w-auto max-w-[min(100%,260px)] object-contain object-left sm:h-[80px] lg:h-[100px]"
            />
          </a>

          <div className="hidden items-center gap-6 md:flex lg:gap-10">
            <a href={aboutHref} style={{ color: navy }} className={navLinkClass}>
              About
            </a>
            <a href={featureHref} style={{ color: navy }} className={navLinkClass}>
              Features
            </a>
            <a href={contactHref} style={{ color: navy }} className={navLinkClass}>
              Contact
            </a>
            {canAccessKlasrum && (
              <Link href="/klasrum" style={{ color: navy }} className={navLinkClass}>
                Klasrum
              </Link>
            )}
            <Link
              href="/admin"
              className="rounded-[10px] border border-neutral-300/80 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-sm transition-[box-shadow,background-color] hover:bg-neutral-50 hover:shadow"
            >
              Admin Center
            </Link>
          </div>

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

        {menuOpen && (
          <div className="mt-3 flex flex-col gap-5 border-t border-black/10 pb-3 pt-4 md:hidden">
            <a href={aboutHref} style={{ color: navy }} className={navLinkClass} onClick={() => setMenuOpen(false)}>
              About
            </a>
            <a href={featureHref} style={{ color: navy }} className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Features
            </a>
            <a href={contactHref} style={{ color: navy }} className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            {canAccessKlasrum && (
              <Link
                href="/klasrum"
                style={{ color: navy }}
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Klasrum
              </Link>
            )}
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
  )
}
