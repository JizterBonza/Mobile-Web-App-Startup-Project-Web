import { Link } from '@inertiajs/react'

export function Footer() {
  return (
    <footer id="footer" className="scroll-mt-20 border-t border-white/10 bg-[#102059] py-16 text-white">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 text-2xl font-semibold">Klasmeyt</div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Digital marketplace for gamefowl supplies—built for stores, breeders, and enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">Navigate</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a href="#home" className="transition-colors hover:text-white">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#about" className="transition-colors hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#feature" className="transition-colors hover:text-white">
                    Feature
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">For stores</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link href="/register-store" className="transition-colors hover:text-white">
                    Register your store
                  </Link>
                </li>
                <li>
                  <a href="#feature" className="transition-colors hover:text-white">
                    Platform features
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">Company</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <span className="cursor-default text-gray-500">Privacy</span>
                </li>
                <li>
                  <span className="cursor-default text-gray-500">Terms</span>
                </li>
                <li>
                  <Link href="/admin" className="transition-colors hover:text-white">
                    Admin Centre
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-xs text-gray-400">
            <p>&copy; {new Date().getFullYear()} Klasmeyt. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
