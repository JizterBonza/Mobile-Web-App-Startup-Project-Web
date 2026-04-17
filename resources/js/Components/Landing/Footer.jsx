function AgrifyWordmark() {
  return (
    <div className="mt-1 flex flex-col items-center leading-none md:items-end">
      <span className="flex items-baseline font-bold italic text-[#555] uppercase tracking-tight" style={{ fontSize: '30px' }}>
        <span>AGR</span>
        <span className="relative inline-flex min-w-[0.55em] justify-center">
          <span className="relative z-10">I</span>
          <svg
            className="pointer-events-none absolute -top-0.5 left-1/2 h-2.5 w-3 -translate-x-1/2 text-[#666]"
            viewBox="0 0 12 10"
            aria-hidden
          >
            <path
              d="M1 8 Q6 0 11 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>FY</span>
      </span>
      <span className="mt-1 text-[11px] font-normal tracking-[0.35em] text-[#999] not-italic normal-case">
        Connect
      </span>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      id="footer"
      className="scroll-mt-20 border-t border-gray-100 bg-white py-10 font-sans"
    >
      <div className="w-full max-w-none px-6 sm:px-10 lg:px-14 xl:px-16 2xl:px-20">
        <div className="grid grid-cols-1 items-center gap-8 text-center md:grid-cols-3 md:gap-6 md:text-left">
          <p className="text-sm text-[#999] md:text-left">&copy; {year} Klasmeyt. All rights reserved</p>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-sm md:justify-center"
            aria-label="Legal"
          >
            <a href="#privacy-policy" className="text-black transition-opacity hover:opacity-75" style={{ color: '#0B132B', marginRight: '30px' }}>
              Privacy Policy
            </a>
            <a href="#terms-of-service" className="text-black transition-opacity hover:opacity-75" style={{ color: '#0B132B', marginRight: '30px' }}>
              Terms of Service
            </a>
            <a href="#cookie-policy" className="text-black transition-opacity hover:opacity-75" style={{ color: '#0B132B', marginRight: '30px' }}>
              Cookie Policy
            </a>
          </nav>

          <div className="flex flex-col items-center md:items-end">
            <p className="text-xs text-[#999]" style={{ marginBottom: '0px' }}>Developed by</p>
            <AgrifyWordmark />
          </div>
        </div>
      </div>
    </footer>
  )
}
