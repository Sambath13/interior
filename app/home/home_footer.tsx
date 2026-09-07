"use client";

import Link from "next/link";
import "./home_footer.css";

const FOOTER_SECTIONS = [
  {
    title: "PRODUCT",
    links: [
      { label: "Footprint Charts", href: "/footprint" },
      { label: "Orderflow & DOM", href: "/home#why-us" },
      { label: "Multi-Chart Layouts", href: "/charting" },
      { label: "Market & Volume Profile", href: "/home#why-us" },
      { label: "Options Strategy Desk", href: "/charting" },
      { label: "One-Click Trading", href: "/home#why-us" },
      { label: "Pricing & Plans", href: "/pricing" },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Terms of Service", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Risk Disclosure", href: "#" },
      { label: "Refund Policy", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Security & Compliance", href: "#" },
    ],
  },
  {
    title: "MARKETS",
    links: [
      { label: "CME & CBOT Futures", href: "/charting" },
      { label: "NSE & BSE India Equities", href: "/footprint" },
      { label: "MCX Commodities", href: "/charting" },
      { label: "US Equities & Options", href: "/charting" },
      { label: "Crypto Derivatives", href: "/footprint" },
      { label: "Global Forex", href: "/charting" },
    ],
  },
];

export default function HomeFooter() {
  return (
    <footer className="home-footer" role="contentinfo">
      <div className="home-footer-inner">
        {/* Navigation columns */}
        <div className="home-footer-grid">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="home-footer-col">
              <h3 className="home-footer-heading">{section.title}</h3>
              <ul className="home-footer-list">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="home-footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom meta row */}
        <div className="home-footer-bottom">
          <div className="home-footer-brand">
            <Link href="/home" className="home-footer-logo">
              <span className="home-footer-logo-mark" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#f0b429" />
                  <path
                    d="M7 22V18.5M11.5 22V14M16 22V11M20.5 22V15.5M25 22V9"
                    stroke="#111"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="home-footer-logo-text">TradeFoot</span>
            </Link>
            <p className="home-footer-copyright">
              © {new Date().getFullYear()} TradeFoot Technologies Inc. All rights reserved.
            </p>
          </div>

          <div className="home-footer-socials" aria-label="Social links">
            {/* X / Twitter */}
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-social"
              aria-label="Follow us on X (Twitter)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-social"
              aria-label="Subscribe on YouTube"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* Discord */}
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-social"
              aria-label="Join our Discord community"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-social"
              aria-label="Connect on LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76c.97 0 1.76.79 1.76 1.76s-.79 1.76-1.76 1.76m1.4 9.74v-8.37H5.06v8.37h2.8z" />
              </svg>
            </a>

            {/* Telegram */}
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-social"
              aria-label="Join our Telegram channel"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Risk disclaimer */}
        <div className="home-footer-disclaimer">
          <p>
            <strong>Risk Disclosure:</strong> Trading financial instruments including futures,
            options, equities, commodities, forex, and cryptocurrencies involves substantial risk
            of loss and is not suitable for all investors. Market data and orderflow analytics are
            provided for informational and educational purposes only and do not constitute financial,
            investment, or trading advice. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
