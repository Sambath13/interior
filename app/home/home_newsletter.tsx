"use client";

import { FormEvent, useState } from "react";
import "./home_newsletter.css";

export default function HomeNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setStatus("error");
      setErrorMessage("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    // Simulate quick server subscribe
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 800);
  };

  return (
    <section className="home-newsletter" aria-labelledby="newsletter-heading">
      <div className="home-newsletter-container">
        <div className="home-newsletter-badge">STAY IN THE LOOP</div>
        
        <h2 id="newsletter-heading" className="home-newsletter-title">
          Get Market Insights &amp; Platform Updates
        </h2>

        <p className="home-newsletter-subtitle">
          Join 50,000+ traders who get our weekly newsletter with market analysis, new feature
          announcements, and trading tips.
        </p>

        {status === "success" ? (
          <div className="home-newsletter-success" role="status">
            <div className="home-newsletter-success-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <strong>You&apos;re subscribed!</strong>
              <p>Check your inbox for our latest market updates.</p>
            </div>
            <button
              type="button"
              className="home-newsletter-reset"
              onClick={() => setStatus("idle")}
            >
              Subscribe another
            </button>
          </div>
        ) : (
          <form className="home-newsletter-form" onSubmit={handleSubmit} noValidate>
            <div className="home-newsletter-input-group">
              <input
                type="email"
                className={`home-newsletter-input${status === "error" ? " is-error" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="Enter your email address"
                aria-label="Enter your email address"
                aria-invalid={status === "error"}
                disabled={status === "loading"}
              />
              <button
                type="submit"
                className="home-newsletter-btn"
                disabled={status === "loading"}
                aria-label="Subscribe to newsletter"
              >
                {status === "loading" ? (
                  <span className="home-newsletter-spinner" aria-hidden="true" />
                ) : (
                  <>
                    <span>Subscribe</span>
                    <span className="home-newsletter-arrow" aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
            {status === "error" && errorMessage && (
              <p className="home-newsletter-error" role="alert">
                {errorMessage}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
