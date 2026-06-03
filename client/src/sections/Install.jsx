import CopyCommand from "../components/CopyCommand.jsx";
import Icon from "../components/Icon.jsx";
import { NPM_INSTALL, GITHUB_URL, NPM_URL } from "../data/content.js";
import "./Install.css";

export default function Install() {
  return (
    <section className="section install" id="install">
      <div className="container">
        <div className="install-card reveal">
          <span className="kicker">Get started</span>
          <h2 className="install-title">Install once. Build anywhere.</h2>
          <p className="lede">
            Start instantly on the free tier, or bring your own key for unlimited
            runs. No config files, no boilerplate.
          </p>

          <div className="install-actions">
            <CopyCommand command={NPM_INSTALL} />
          </div>

          <div className="install-links">
            <a href={NPM_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
              <Icon name="npm" size={17} /> View on npm
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <Icon name="github" size={17} /> Source on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
