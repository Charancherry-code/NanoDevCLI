import { COMMANDS } from "../data/content.js";
import "./Commands.css";

export default function Commands() {
  return (
    <section className="section" id="commands">
      <div className="container commands-inner">
        <div className="commands-copy reveal">
          <span className="kicker">In-session</span>
          <h2 className="h2">Slash commands, autocompleted</h2>
          <p className="lede">
            Type <code className="inline-code">/</code> and press Tab. Switch models,
            inspect tools, track tokens, or save project memory without leaving the
            prompt.
          </p>
        </div>

        <div className="commands-panel reveal">
          <div className="commands-bar">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <ul className="commands-list">
            {COMMANDS.map(([cmd, desc]) => (
              <li key={cmd}>
                <span className="cmd-name">{cmd}</span>
                <span className="cmd-desc">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
