import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CartButton } from "@/components/cart/cart-button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/layout/logo";
import { SearchBar } from "@/components/layout/search-bar";
import { HeaderAccount } from "@/components/layout/header-account";
import { MobileNav } from "@/components/layout/mobile-nav";

const SITE_NAME = "Trillion Mart";

const HELP_LINKS = [
  { href: "/help-center", label: "Help Center" },
  { href: "/pages/contact", label: "Contact Customer Care" },
  { href: "/pages/faq", label: "FAQ" },
  { href: "/pages/shipping", label: "Shipping & Delivery" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/pages/returns", label: "Returns & Refunds" },
];

export async function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#f85606] shadow-md">
      <div className="hidden md:block">
        <Container>
          <div className="flex h-9 items-center justify-end gap-8 text-xs font-medium text-white">
            <Link href="/pages/about" className="hover:underline">SAVE MORE ON APP</Link>
            <Link href="/auth/register" className="hover:underline">BECOME A SELLER</Link>

            <div className="group relative flex h-9 items-center">
              <Link href="/help-center" className="flex items-center gap-1 hover:underline">
                HELP &amp; SUPPORT <ChevronDown className="h-3.5 w-3.5" />
              </Link>
              <div className="invisible absolute right-0 top-full z-[9999] w-[230px] pt-0 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                <ul className="border border-gray-100 bg-white py-2 text-left text-[14px] font-medium text-gray-800 shadow-xl">
                  {HELP_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="block px-5 py-2.5 hover:bg-gray-100 hover:text-[#f85606]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <HeaderAccount />
          </div>
        </Container>
      </div>

      <Container>
        <div className="flex min-w-0 items-center gap-2 py-3 md:h-[72px] md:gap-6 md:py-0">
          <div className="shrink-0 md:hidden">
            <MobileNav items={[
              { href: "/home", label: "Home" },
              { href: "/shop", label: "Shop All" },
              { href: "/categories", label: "Categories" },
              { href: "/cart", label: "Shopping Cart" },
              { href: "/account", label: "My Account" },
              { href: "/account/orders", label: "My Orders" },
              { href: "/help-center", label: "Help Center" }
            ]} />
          </div>

          <Link href="/" className="shrink-0 hover:opacity-90" aria-label={SITE_NAME}>
            <Logo name={SITE_NAME} variant="white" />
          </Link>

          <div className="hidden min-w-0 flex-1 md:block">
            <SearchBar siteName={SITE_NAME} />
          </div>

          <div className="flex shrink-0 items-center gap-2 text-[10px] sm:text-xs md:hidden">
            <HeaderAccount />
          </div>

          <CartButton />
        </div>

        <div className="min-w-0 pb-3 md:hidden">
          <SearchBar siteName={SITE_NAME} />
        </div>
      </Container>
    </header>
  );
}
