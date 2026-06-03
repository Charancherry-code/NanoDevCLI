import Terminal from "../components/Terminal.jsx";
import BlockLogo from "../components/BlockLogo.jsx";
import CopyCommand from "../components/CopyCommand.jsx";
import Icon from "../components/Icon.jsx";
import { NPM_INSTALL, GITHUB_URL } from "../data/content.js";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="container hero-inner">
        <a className="hero-pill" href="#install">
          <span className="hero-pill-tag">v1.0</span>
          Now on npm
          <span className="hero-pill-arrow">→</span>
        </a>

        <div className="hero-logo-wrap">
          <BlockLogo />
        </div>

        <h1 className="hero-title">
          The AI coding agent for your terminal
        </h1>

        <p className="hero-lede">
          Describe a task in plain English. nano-dev reads, writes, edits, and runs
          your code by calling real tools in a loop — until it's done.
        </p>

        <div className="hero-actions">
          <CopyCommand command={NPM_INSTALL} />
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
            <Icon name="github" size={17} /> GitHub
          </a>
        </div>

        <div className="hero-terminal">
          <Terminal />
        </div>
      </div>
    </section>
  );
}
