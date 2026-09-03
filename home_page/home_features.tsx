"use client";

import Link from "next/link";
import "./home_features.css";

function FootprintIcon() {
  return (
    <svg className="home-feat-icon" viewBox="0 0 72 56" fill="none" aria-hidden="true">
      <rect x="8" y="10" width="18" height="6" rx="1.5" fill="#22c55e" />
      <rect x="8" y="18" width="18" height="6" rx="1.5" fill="#ef4444" />
      <rect x="8" y="26" width="18" height="6" rx="1.5" fill="#22c55e" />
      <rect x="8" y="34" width="18" height="6" rx="1.5" fill="#ef4444" />
      <rect x="32" y="6" width="18" height="6" rx="1.5" fill="#ef4444" />
      <rect x="32" y="14" width="18" height="6" rx="1.5" fill="#22c55e" />
      <rect x="32" y="22" width="18" height="6" rx="1.5" fill="#22c55e" />
      <rect x="32" y="30" width="18" height="6" rx="1.5" fill="#ef4444" />
      <rect x="32" y="38" width="18" height="6" rx="1.5" fill="#22c55e" />
      <rect x="56" y="16" width="10" height="5" rx="1.5" fill="#22c55e" />
      <rect x="56" y="23" width="10" height="5" rx="1.5" fill="#ef4444" />
      <rect x="56" y="30" width="10" height="5" rx="1.5" fill="#22c55e" />
    </svg>
  );
}

function TradingIcon() {
  return (
    <svg className="home-feat-icon" viewBox="0 0 72 56" fill="none" aria-hidden="true">
      <path
        d="M8 38 L22 28 L34 32 L50 14 L64 20"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="64" cy="20" r="3.5" fill="#22c55e" />
      <rect x="24" y="42" width="24" height="8" rx="4" fill="#22c55e" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="home-feat-icon" viewBox="0 0 72 56" fill="none" aria-hidden="true">
      <path
        d="M36 8c-8 0-14 6.2-14 14v8.5l-4 6.5h36l-4-6.5V22C50 14.2 44 8 36 8Z"
        fill="#f0b429"
      />
      <path d="M30 44c1.4 3 4 5 6 5s4.6-2 6-5" stroke="#f0b429" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="14" r="5" fill="#ef4444" />
      <rect x="22" y="48" width="28" height="6" rx="3" fill="#1f2937" stroke="#f0b429" />
    </svg>
  );
}

export default function HomeFeatures() {
  return (
    <>
      <section className="home-features">
        <h2>Supercharge Your Trading Strategy With...</h2>
        <div className="home-feature-grid">
          <article className="home-feature-card">
            <FootprintIcon />
            <h3>Orderflow & Footprint Charts</h3>
            <p>
              Decode the markets with Footprint charts, Market Profile, and
              Cumulative Volume Delta.
            </p>
          </article>
          <article className="home-feature-card">
            <TradingIcon />
            <h3>One-Click Trading</h3>
            <p>
              Connect to your broker and execute trades instantly with just one
              click.
            </p>
          </article>
          <article className="home-feature-card">
            <AlertIcon />
            <h3>Smart Alerts</h3>
            <p>
              Get notified of market moves instantly, so you are always one step
              ahead—no more surprises!
            </p>
          </article>
        </div>
        <Link href="/features" className="home-feature-cta">
          Explore all features
        </Link>
      </section>

      <section className="home-price-banner">
        <div className="home-price-card">
          <div className="home-price-copy">
            <h2>Unlock Powerful Trading Tools at an Unbeatable Price</h2>
            <ul>
              <li>
                <span aria-hidden="true">⚡</span>
                Professional tools, fraction of Bloomberg&apos;s cost
              </li>
              <li>
                <span aria-hidden="true">🔒</span>
                Cancel anytime · No lock-in contracts
              </li>
              <li>
                <span aria-hidden="true">📱</span>
                Web + iOS + Android — all platforms included
              </li>
            </ul>
          </div>
          <Link href="/pricing" className="home-price-btn">
            Try Premium
          </Link>
        </div>
      </section>
    </>
  );
}
