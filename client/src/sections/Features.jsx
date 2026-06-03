import Icon from "../components/Icon.jsx";
import { FEATURES } from "../data/content.js";
import "./Features.css";

export default function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head reveal">
          <span className="kicker">Capabilities</span>
          <h2 className="h2">Built like a real agent, not a wrapper</h2>
          <p className="lede">
            A genuine tool-calling loop with the guardrails, memory, and model
            flexibility you'd expect from production software.
          </p>
        </div>

        <div className="feat-grid">
          {FEATURES.map((f, i) => (
            <article
              className="feat-card reveal"
              style={{ transitionDelay: `${(i % 3) * 70}ms` }}
              key={f.title}
            >
              <div className="feat-top">
                <span className="feat-icon">
                  <Icon name={f.icon} size={20} />
                </span>
                <span className="feat-no mono">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-body">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
