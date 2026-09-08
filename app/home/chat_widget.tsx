"use client";

import { useState } from "react";
import "./chat_widget.css";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "bot" | "user"; text: string }>>([
    {
      sender: "bot",
      text: "👋 Welcome to TradeFoot! How can we help you today with charts, orderflow, or broker setup?",
    },
  ]);
  const [inputVal, setInputVal] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInputVal("");

    // Simulate intelligent quick bot response
    setTimeout(() => {
      let reply = "Thanks for reaching out! Our market support team is online 24/5 during active trading sessions. You can also explore our Footprint & DOM docs at /footprint.";
      const lower = userText.toLowerCase();
      if (lower.includes("footprint") || lower.includes("orderflow")) {
        reply = "TradeFoot offers tick-by-tick Footprint with Delta, Imbalance, and Volume profile. Click 'Footprint' in the top menu to view live demo charts!";
      } else if (lower.includes("price") || lower.includes("pricing") || lower.includes("cost") || lower.includes("plan")) {
        reply = "We offer flexible Lite & Premium tiers starting at ₹299/mo with cancel-anytime flexibility. Check out /pricing for plan comparisons!";
      } else if (lower.includes("broker") || lower.includes("zerodha") || lower.includes("dhan") || lower.includes("fyers")) {
        reply = "TradeFoot seamlessly connects with Zerodha, Dhan, Fyers, and Upstox for 1-click execution straight from the chart ladder!";
      }

      setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
    }, 600);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        type="button"
        className={`home-chat-trigger${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close live chat" : "Open live chat support"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24" style={{ width: 24, height: 24 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ width: 24, height: 24 }}>
            <path d="M5 18.5l-1.2 3.4c-.2.6.4 1.1.9.9L8.2 21A9 9 0 1012 21H5z" />
          </svg>
        )}
      </button>

      {/* Interactive Chat Popup Window */}
      {isOpen && (
        <div className="home-chat-modal" role="dialog" aria-label="TradeFoot Support Chat">
          <div className="home-chat-header">
            <div className="home-chat-header-info">
              <span className="home-chat-status-dot" />
              <div>
                <h4>TradeFoot Copilot</h4>
                <p>Orderflow &amp; Market Support</p>
              </div>
            </div>
            <button
              type="button"
              className="home-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="home-chat-body">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`home-chat-msg ${msg.sender === "bot" ? "is-bot" : "is-user"}`}
              >
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="home-chat-quick-actions">
            <button
              type="button"
              onClick={() => {
                setMessages((p) => [
                  ...p,
                  { sender: "user", text: "How do Footprint charts work?" },
                  {
                    sender: "bot",
                    text: "Footprint charts show buying & selling volume at each individual price level inside every candlestick, revealing aggressive buyers and sellers.",
                  },
                ]);
              }}
            >
              📊 Footprint charts
            </button>
            <button
              type="button"
              onClick={() => {
                setMessages((p) => [
                  ...p,
                  { sender: "user", text: "What brokers are supported?" },
                  {
                    sender: "bot",
                    text: "We support Zerodha, Dhan, Fyers, Upstox, and Tradovate for direct order placement from the chart.",
                  },
                ]);
              }}
            >
              🔌 Brokers
            </button>
          </div>

          <form className="home-chat-footer" onSubmit={handleSend}>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask a question..."
              aria-label="Ask a question"
            />
            <button type="submit" aria-label="Send message">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
