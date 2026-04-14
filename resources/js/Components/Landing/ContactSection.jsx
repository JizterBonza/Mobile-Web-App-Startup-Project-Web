const sectionBg = '#0B132B'
const buttonBlue = '#2E4A9E'

function SocialIconFacebook({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  )
}

function SocialIconInstagram({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  )
}

function SocialIconTikTok({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64v-3.5a6.37 6.37 0 00-1-.09A6.34 6.34 0 005 17.32a6.34 6.34 0 0010.86-4.43V7.07a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.5z"
      />
    </svg>
  )
}

const socialLinks = [
  {
    label: 'Klasmeyt on Facebook',
    href: 'https://www.facebook.com/',
    Icon: SocialIconFacebook,
  },
  {
    label: 'Klasmeyt on Instagram',
    href: 'https://www.instagram.com/',
    Icon: SocialIconInstagram,
  },
  {
    label: 'Klasmeyt on TikTok',
    href: 'https://www.tiktok.com/',
    Icon: SocialIconTikTok,
  },
]

export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 py-16 lg:py-24" style={{ backgroundColor: sectionBg }}>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20 lg:items-start">
          <div className="max-w-xl">
            <p className="text-base font-medium text-white sm:text-lg">Get in Touch</p>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-tight tracking-tight text-white sm:text-4xl lg:text-[3rem]" style={{ fontWeight: 'bold', fontSize: '3rem' }}>
              We&apos;d love to connect
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/90 sm:text-lg">
              Learn more about our market opportunity, business model, and expansion plans—and discover how you
              can be part of Klasmeyt&apos;s growth.
            </p>
            <p className="mt-10 text-sm font-medium text-white sm:text-base">Follow us</p>
            <ul className="mt-4 flex flex-wrap gap-4" role="list">
              {socialLinks.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0B132B] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <form
            className="w-full max-w-xl lg:max-w-none lg:justify-self-end"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              <div>
                <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-white">
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="w-full rounded-[10px] border-0 bg-white px-4 py-3 text-sm text-[#0B132B] outline-none ring-1 ring-white/10 transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-white/40"
                  placeholder=""
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-white">
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-[10px] border-0 bg-white px-4 py-3 text-sm text-[#0B132B] outline-none ring-1 ring-white/10 transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-white/40"
                  placeholder=""
                />
              </div>
            </div>
            <div className="mt-5 sm:mt-6">
              <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-white">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                className="w-full resize-y rounded-[10px] border-0 bg-white px-4 py-3 text-sm text-[#0B132B] outline-none ring-1 ring-white/10 transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-white/40"
                placeholder=""
                style={{ borderRadius: '0px' }}
              />
            </div>
            <button
              type="submit"
              className="mt-6 w-full rounded-[10px] px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B] sm:mt-8"
              style={{ backgroundColor: buttonBlue, borderRadius: '10px', marginTop: '30px' }}
            >
              SEND MESSAGE
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
