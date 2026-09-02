"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import "./home_page.css";

type PageId =
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
        href: "/products",
        label: "Charting",
        text: "Multi-asset charts and layouts",
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
  { id: "trading", label: "Trading", href: "/trading" },
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

const PAGE_CONTENT: Record<
  Exclude<PageId, "home">,
  { title: string; lead: string; cards: { title: string; text: string }[] }
> = {
  products: {
    title: "Products built for serious traders",
    lead: "Chart, analyse, and execute from one unified trading platform — futures, forex, stocks, and crypto.",
    cards: [
      {
        title: "Charting",
        text: "15+ chart types, multi-monitor layouts, and cloud workspaces that follow you across devices.",
      },
      {
        title: "Orderflow",
        text: "Footprint charts, volume profile, delta, DOM, and time & sales in a single tape.",
      },
      {
        title: "Options Desk",
        text: "Live chain, OI buildup, PCR, and strategy builder for index and stock options.",
      },
      {
        title: "Broker Trading",
        text: "Connect your broker and place orders directly from the chart with one click.",
      },
    ],
  },
  features: {
    title: "Advanced analytics, without the clutter",
    lead: "Professional orderflow tools, alerts, and scripting — designed to keep you one step ahead of the tape.",
    cards: [
      {
        title: "Footprint Charts",
        text: "Decode bid/ask imbalances and volume delta at every price level.",
      },
      {
        title: "Market Profile",
        text: "Read session value, poor highs/lows, and auction structure like a market maker.",
      },
      {
        title: "Smart Alerts",
        text: "Trigger on price, volume, or custom Lipi conditions and get notified instantly.",
      },
      {
        title: "Lipi Scripts",
        text: "Build custom indicators, backtests, and automated strategies in the platform.",
      },
    ],
  },
  trading: {
    title: "Trade directly from the chart",
    lead: "Connect a broker, size the order, and execute in one click — without leaving your orderflow workspace.",
    cards: [
      {
        title: "One-Click Execution",
        text: "Buy and sell from the chart or DOM with confirmations you control.",
      },
      {
        title: "Depth of Market",
        text: "Full ladder, order book, and time & sales beside your footprint chart.",
      },
      {
        title: "Multi-Asset",
        text: "Futures, forex, stocks, and crypto from a single unified trading platform.",
      },
      {
        title: "Risk Controls",
        text: "Position size, brackets, and working orders stay visible while you trade.",
      },
    ],
  },
  pricing: {
    title: "Professional tools, transparent pricing",
    lead: "Start free. Upgrade when you need real-time data, full orderflow, and live broker trading.",
    cards: [
      {
        title: "Free",
        text: "Core charting, EOD data, bar replay, and essential indicators — no card required.",
      },
      {
        title: "Lite",
        text: "More layouts, custom intervals, options chain, and broker connection.",
      },
      {
        title: "Premium",
        text: "Tick data, footprint suite, market profile, alerts, and full platform access.",
      },
      {
        title: "Annual",
        text: "Save on yearly billing. Web, iOS, and Android included on every plan.",
      },
    ],
  },
  resources: {
    title: "Learn the platform. Trade with context.",
    lead: "Docs, webinars, and community support so you can go from first chart to live execution faster.",
    cards: [
      {
        title: "Help Center",
        text: "Step-by-step setup for charts, orderflow, brokers, and alerts.",
      },
      {
        title: "Documentation",
        text: "Reference for drawing tools, Lipi, and advanced orderflow modules.",
      },
      {
        title: "Webinars",
        text: "Daily live sessions covering tape reading, profile, and trade management.",
      },
      {
        title: "Community",
        text: "Join millions of traders sharing layouts, scripts, and market ideas.",
      },
    ],
  },
};

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
      <path
        d="M8 1.6L14.4 8L8 14.4L1.6 8L8 1.6Z"
        fill="#111"
      />
    </svg>
  );
}

function Header({ current }: { current: PageId }) {
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
            Upgrade
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

function Hero() {
  const [symbol, setSymbol] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="home-kicker">UNIFIED TRADING PLATFORM</p>
        <h1 className="home-headline">
          Advanced <span>Orderflow</span> Trading Platform
        </h1>
        <p className="home-lead">
          TradeFoot is a multi-asset orderflow charting and trading platform.
          Trade futures, forex, stocks, and crypto with advanced analytics tools
          trusted by 3+ million traders worldwide.
        </p>

        <form className="home-search" onSubmit={handleSearch}>
          <input
            type="search"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder="Search Symbol"
            aria-label="Search Symbol"
          />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10h12M11 5l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <Link href="/features" className="home-learn">
          Learn more <span aria-hidden="true">&gt;</span>
        </Link>
      </div>

      <div className="home-hero-visual">
        <img
          src="/home/hero.jpg"
          alt="Trader analysing orderflow charts on a desktop and laptop"
        />
        <div className="home-hero-fade" />
      </div>
    </section>
  );
}

function InnerPage({ page }: { page: Exclude<PageId, "home"> }) {
  const content = PAGE_CONTENT[page];

  return (
    <section className="home-inner">
      <p className="home-kicker">UNIFIED TRADING PLATFORM</p>
      <h1 className="home-inner-title">{content.title}</h1>
      <p className="home-lead">{content.lead}</p>
      <div className="home-cards">
        {content.cards.map((card) => (
          <article key={card.title} className="home-card">
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const pathname = usePathname();
  const current = (pathname.replace(/^\//, "") || "home") as PageId;

  return (
    <div className="home-page">
      <Header current={current} />
      {current === "home" ? <Hero /> : <InnerPage page={current} />}
    </div>
  );
}
