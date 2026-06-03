import Icon from "./Icon.jsx";
import { GITHUB_URL, NPM_URL } from "../data/content.js";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            <span className="footer-mark mono">~/</span> nano-dev
          </span>
          <p className="footer-tag">A tiny AI coding agent that lives in your terminal.</p>
        </div>

        <nav className="footer-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#commands">Commands</a>
          <a href={NPM_URL} target="_blank" rel="noreferrer">
            npm
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="footer-gh" aria-label="GitHub">
            <Icon name="github" size={18} />
          </a>
        </nav>
      </div>

      <div className="container footer-bottom mono">
        <span>MIT licensed</span>
        <span>© {new Date().getFullYear()} nano-dev</span>
      </div>
    </footer>
  );
}
