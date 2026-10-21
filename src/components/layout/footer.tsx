import Link from "next/link";
import fs from "fs";
import path from "path";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/layout/logo";

const SITE_NAME = "Trillion Mart";

const PAYMENTS = [
  { id: "cod", label: "Cash on Delivery", bg: "#2d2d2d" },
  { id: "bkash", label: "bKash", bg: "#e2136e" },
  { id: "nagad", label: "Nagad", bg: "#f6921e" },
  { id: "rocket", label: "Rocket", bg: "#8c3494" },
  { id: "bank", label: "Bank Transfer", bg: "#0b5ea8" },
];

function findLogo(id: string): string | null {
  for (const ext of ["png", "svg", "webp", "jpg", "jpeg"]) {
    const file = path.join(process.cwd(), "public", "payments", id + "." + ext);
    if (fs.existsSync(file)) return "/payments/" + id + "." + ext;
  }
  return null;
}

function BangladeshFlag({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Bangladesh flag" style={{ borderRadius: "50%", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
      <circle cx="12" cy="12" r="12" fill="#006a4e" />
      <circle cx="11" cy="12" r="5.5" fill="#f42a41" />
    </svg>
  );
}

export async function Footer() {
  const linkStyle = "text-sm text-gray-500 hover:text-[#f85606]";

  return (
    <footer style={{ marginTop: 40 }}>
      <style>{`
        .pay-badge{filter:grayscale(1);opacity:.8;transition:filter .2s ease,opacity .2s ease,transform .2s ease}
        .pay-badge:hover{filter:none;opacity:1;transform:translateY(-1px)}
      `}</style>

      <div style={{ background: "#ffffff", padding: "32px 0" }}>
        <Container>
          <h3 style={{ fontSize: 18, color: "#1f2937", marginBottom: 16 }}>Payment Methods</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {PAYMENTS.map((p) => {
              const logo = findLogo(p.id);
              return logo ? (
                <span
                  key={p.id}
                  className="pay-badge"
                  title={p.label}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, minWidth: 64, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt={p.label} style={{ height: 28, width: "auto", maxWidth: 90, objectFit: "contain" }} />
                </span>
              ) : (
                <span
                  key={p.id}
                  className="pay-badge"
                  title={p.label}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 14px", borderRadius: 4, background: p.bg, color: "#ffffff", fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}
                >
                  {p.label}
                </span>
              );
            })}
          </div>

          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 18, color: "#1f2937", marginBottom: 12 }}>We deliver all over Bangladesh</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#4b5563" }}>
              <BangladeshFlag size={26} />
              <span>Inside Dhaka 1-2 days &middot; Outside Dhaka 3-5 days</span>
            </div>
          </div>
        </Container>
      </div>

      <div style={{ background: "#f5f5f5", padding: "40px 0" }}>
        <Container>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <h3 style={{ fontSize: 20, color: "#1f2937" }}>Online Shopping in Bangladesh with {SITE_NAME}</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {SITE_NAME} brings quality products to your door anywhere in Bangladesh. Browse electronics, books, health and beauty,
                clothing and much more at fair prices.
              </p>
              <p className="text-sm leading-relaxed text-gray-600">
                Pay with cash on delivery, bKash, Nagad, Rocket or bank transfer. Every order is tracked from Pending to Delivered, and
                you can follow it from your account at any time.
              </p>
              <p className="text-sm leading-relaxed text-gray-600">
                Read real customer reviews with photos before you buy, and enjoy easy 7-day returns.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 20, color: "#1f2937", marginBottom: 12 }}>Customer Service</h3>
              <ul className="space-y-2">
                <li><Link href="/pages/contact" className={linkStyle}>Contact Us</Link></li>
                <li><Link href="/pages/shipping" className={linkStyle}>Shipping &amp; Delivery</Link></li>
                <li><Link href="/pages/returns" className={linkStyle}>Returns &amp; Refunds</Link></li>
                <li><Link href="/pages/faq" className={linkStyle}>FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: 20, color: "#1f2937", marginBottom: 12 }}>Company</h3>
              <ul className="space-y-2">
                <li><Link href="/pages/about" className={linkStyle}>About Us</Link></li>
                <li><Link href="/pages/privacy" className={linkStyle}>Privacy Policy</Link></li>
                <li><Link href="/pages/terms" className={linkStyle}>Terms &amp; Conditions</Link></li>
              </ul>
            </div>
          </div>
        </Container>
      </div>

      <div style={{ background: "#ffffff", borderTop: "1px solid #e5e7eb", padding: "32px 0" }}>
        <Container>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo name={SITE_NAME} variant="orange" />
              <BangladeshFlag size={28} />
            </div>
            <p className="text-sm text-gray-500">Quality products, delivered to your door.</p>
            <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}