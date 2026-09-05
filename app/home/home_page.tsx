"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import HomeHeader from "./home_header";
import WhyUs from "./why_us";
import HomeFeatures from "./home_features";
import "./home_page.css";

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

        <Link href="#why-us" className="home-learn">
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

export default function HomePage() {
  return (
    <div className="home-page">
      <HomeHeader current="home" />
      <Hero />
      <WhyUs />
      <HomeFeatures />
    </div>
  );
}
