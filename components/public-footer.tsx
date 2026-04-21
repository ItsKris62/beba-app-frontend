import Link from "next/link"
import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react"

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center">
              <span className="text-xl font-bold text-primary">KC Boda</span>
              <span className="text-xl font-light text-muted-foreground">|Sacco</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering members with secure savings and affordable credit solutions since 2020.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-muted-foreground transition-colors hover:text-primary">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-muted-foreground transition-colors hover:text-primary">
                  Our Products
                </Link>
              </li>
              <li>
                <Link href="/membership" className="text-muted-foreground transition-colors hover:text-primary">
                  Become a Member
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-4 font-semibold">Products</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products?tab=savings#fosa" className="text-muted-foreground transition-colors hover:text-primary">
                  FOSA Savings
                </Link>
              </li>
              <li>
                <Link href="/products?tab=investments#bosa" className="text-muted-foreground transition-colors hover:text-primary">
                  BOSA Shares
                </Link>
              </li>
              <li>
                <Link href="/products?tab=loans" className="text-muted-foreground transition-colors hover:text-primary">
                  Loan Products
                </Link>
              </li>
              <li>
                <Link href="/products?tab=investments" className="text-muted-foreground transition-colors hover:text-primary">
                  Investment Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Kolwa Central Ward, Kisumu East Subcounty</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>0704 413 592 / 0796 762 007</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>kolwacentralboda@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground md:flex-row">
            <p>&copy; {new Date().getFullYear()} KC Boda Sacco. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="transition-colors hover:text-primary">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-primary">
                Terms of Service
              </Link>
              <span>Regulated by SASRA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
