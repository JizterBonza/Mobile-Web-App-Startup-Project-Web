import { Link } from '@inertiajs/react'

export function Footer() {
  return (
    <footer className="bg-[#102059] text-white py-16">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div>
              <div className="text-2xl font-semibold text-white mb-4">
                Klasmeyt
              </div>
              <p className="text-sm text-gray-400">
                Built for the gamefowl community.
              </p>
            </div>

            {/* For Buyers */}
            <div>
              <h3 className="font-semibold text-sm mb-4 text-white">
                For Buyers
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="#for-buyers"
                    className="hover:text-white transition-colors"
                  >
                    Browse Products
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href="#for-buyers"
                    className="hover:text-white transition-colors"
                  >
                    Download App
                  </a>
                </li>
              </ul>
            </div>

            {/* For Stores */}
            <div>
              <h3 className="font-semibold text-sm mb-4 text-white">
                For Stores
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="#for-stores"
                    className="hover:text-white transition-colors"
                  >
                    Become a Trusted Store
                  </a>
                </li>
                <li>
                  <a
                    href="#for-stores"
                    className="hover:text-white transition-colors"
                  >
                    Benefits
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-sm mb-4 text-white">
                Company
              </h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white transition-colors"
                  >
                    Terms
                  </a>
                </li>
                <li>
                  <Link
                    href="/admin"
                    className="hover:text-white transition-colors"
                  >
                    Admin Centre
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/20 text-gray-400 text-xs">
            <p>
              &copy; {new Date().getFullYear()} Klasmeyt. All
              rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
