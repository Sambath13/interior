"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./home_page.css";

export type PageId =
  | "home"
  | "products"
  | "features"
  | "trading"
  | "pricing"
  | "resources";

type DropdownItem = {
  href: string;
  label: string;
  text: string;
  newTab?: boolean;
};

type NavItem = {
  id: PageId;
  label: string;
  href: string;
  items?: DropdownItem[];
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "products",
    label: "Products",
    href: "/products",
    items: [
      {
        href: "/charting",
        label: "Charting",
        text: "Multi-asset charts and layouts",
        newTab: true,
      },
      {
        href: "/products",
        label: "Orderflow",
        text: "Footprint, DOM, and volume tools",
      },
      {
        href: "/products",
        label: "Options Desk",
        text: "Chain, PCR, and strategy builder",
      },
      {
        href: "/products",
        label: "Broker Trading",
        text: "One-click execution from charts",
      },
    ],
  },
  {
    id: "features",
    label: "Features",
    href: "/features",
    items: [
      {
        href: "/features",
        label: "Footprint Charts",
        text: "See volume at every price",
      },
      {
        href: "/features",
        label: "Market Profile",
        text: "Session structure and TPO",
      },
      {
        href: "/features",
        label: "Smart Alerts",
        text: "Price, volume, and script triggers",
      },
      {
        href: "/features",
        label: "Lipi Scripts",
        text: "Custom indicators and strategies",
      },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    href: "/trading",
    items: [
      {
        href: "/trading",
        label: "One-Click Trading",
        text: "Execute directly from the chart",
      },
      {
        href: "/trading",
        label: "Broker Connections",
        text: "Zerodha, Dhan, Fyers, and more",
      },
      {
        href: "/trading",
        label: "DOM & Order Book",
        text: "Full ladder beside your footprint",
      },
    ],
  },
  { id: "pricing", label: "Pricing", href: "/pricing" },
  {
    id: "resources",
    label: "Resources",
    href: "/resources",
    items: [
      {
        href: "/resources",
        label: "Help Center",
        text: "Guides, FAQs, and support",
      },
      {
        href: "/resources",
        label: "Documentation",
        text: "Platform and API reference",
      },
      {
        href: "/resources",
        label: "Webinars",
        text: "Daily live market sessions",
      },
      {
        href: "/resources",
        label: "Community",
        text: "Join 3M+ traders worldwide",
      },
    ],
  },
];

const REGIONS = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "EU", name: "Europe" },
  { code: "SG", name: "Singapore" },
];

function Logo() {
  return (
    <Link href="/home" className="home-logo">
      <span className="home-logo-mark" aria-hidden="true">
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
      <span className="home-logo-text">TradeFoot</span>
    </Link>
  );
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      className={`home-chevron${open ? " is-open" : ""}`}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RegionFlag({ code }: { code: string }) {
  if (code === "US") {
    return (
      <svg className="home-flag" viewBox="0 0 24 16" aria-hidden="true">
        <rect width="24" height="16" rx="2" fill="#bf0a30" />
        <rect y="2" width="24" height="2" fill="#fff" />
        <rect y="6" width="24" height="2" fill="#fff" />
        <rect y="10" width="24" height="2" fill="#fff" />
        <rect y="14" width="24" height="2" fill="#fff" />
        <rect width="10" height="9" fill="#002868" />
      </svg>
    );
  }

  if (code === "EU") {
    return (
      <svg className="home-flag" viewBox="0 0 24 16" aria-hidden="true">
        <rect width="24" height="16" rx="2" fill="#003399" />
        <circle cx="12" cy="8" r="2.2" fill="#ffcc00" />
      </svg>
    );
  }

  if (code === "SG") {
    return (
      <svg className="home-flag" viewBox="0 0 24 16" aria-hidden="true">
        <rect width="24" height="8" rx="2" fill="#ef3340" />
        <rect y="8" width="24" height="8" fill="#fff" />
        <circle cx="6" cy="5" r="2" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg className="home-flag" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" rx="2" fill="#fff" />
      <rect width="24" height="5.34" fill="#FF9933" />
      <rect y="10.66" width="24" height="5.34" fill="#138808" />
      <circle cx="12" cy="8" r="2.1" fill="#000080" />
      <circle cx="12" cy="8" r="1.15" fill="#fff" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg className="home-diamond" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.6L14.4 8L8 14.4L1.6 8L8 1.6Z" fill="#111" />
    </svg>
  );
}

export default function HomeHeader({ current }: { current: PageId }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [region, setRegion] = useState(REGIONS[0]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
        setRegionOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [current]);

  return (
    <header className="home-header" ref={headerRef}>
      <div className="home-header-inner">
        <Logo />

        <nav className={`home-nav${mobileOpen ? " is-open" : ""}`} aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className="home-nav-item"
              onMouseEnter={() => item.items && setOpenMenu(item.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href={item.href}
                className={`home-nav-link${current === item.id ? " is-active" : ""}`}
                onClick={() => {
                  if (item.items && mobileOpen) {
                    setOpenMenu(openMenu === item.id ? null : item.id);
                  }
                }}
              >
                {item.label}
                {item.items ? <Chevron open={openMenu === item.id} /> : null}
              </Link>
              {item.items && openMenu === item.id ? (
                <div className="home-dropdown">
                  {item.items.map((entry) => (
                    <Link
                      key={entry.label}
                      href={entry.href}
                      className="home-dropdown-link"
                      target={entry.newTab ? "_blank" : undefined}
                      rel={entry.newTab ? "noopener noreferrer" : undefined}
                    >
                      <span>{entry.label}</span>
                      <small>{entry.text}</small>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="home-header-actions">
          <div className="home-region">
            <button
              type="button"
              className="home-region-btn"
              onClick={() => {
                setRegionOpen((open) => !open);
                setOpenMenu(null);
              }}
              aria-expanded={regionOpen}
              aria-haspopup="listbox"
            >
              <RegionFlag code={region.code} />
              <span>
                {region.code} {region.name}
              </span>
              <Chevron open={regionOpen} />
            </button>
            {regionOpen ? (
              <div className="home-dropdown home-dropdown--region" role="listbox">
                {REGIONS.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    className={`home-dropdown-link${
                      option.code === region.code ? " is-active" : ""
                    }`}
                    onClick={() => {
                      setRegion(option);
                      setRegionOpen(false);
                    }}
                  >
                    <span>
                      {option.code} {option.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Link href="/pricing" className="home-upgrade">
            <DiamondIcon />
            <span>Upgrade</span>
          </Link>

          <div className="home-avatar" aria-label="Account">
            G
          </div>

          <button
            type="button"
            className="home-menu-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
