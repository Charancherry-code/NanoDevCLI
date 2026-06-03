import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { GITHUB_URL } from "../data/content.js";
import "./Navbar.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container nav-inner">
        <a href="#top" className="nav-logo">
          <span className="nav-mark mono">~/</span>
          <span className="nav-name">nano-dev</span>
        </a>

        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#commands">Commands</a>
          <a href="#install">Install</a>
        </nav>

        <div className="nav-cta">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="nav-icon"
            aria-label="GitHub"
          >
            <Icon name="github" size={19} />
          </a>
          <a href="#install" className="btn btn-primary nav-install">
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
