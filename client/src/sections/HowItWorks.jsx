import { STEPS } from "../data/content.js";
import "./HowItWorks.css";

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head reveal">
          <span className="kicker">The loop</span>
          <h2 className="h2">Idea to running code, in three steps</h2>
          <p className="lede">
            The entire tool is one idea repeated: ask the model what to do, run the
            tool it picks, feed back the result, repeat until done.
          </p>
        </div>

        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step reveal" style={{ transitionDelay: `${i * 80}ms` }} key={s.n}>
              <span className="step-n mono">STEP {s.n}</span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
              <pre className="step-code mono">
                <code>{s.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
