import { useEffect, useRef, useReducer } from "react";
import { TERMINAL_LINES } from "../data/content.js";
import "./Terminal.css";

const colorByType = {
  prompt: "t-prompt",
  step: "t-step",
  ok: "t-ok",
  agent: "t-agent",
  tokens: "t-tokens",
};

/**
 * Animated terminal that plays a realistic agent session on a loop:
 *  - the prompt line "types" character by character
 *  - tool/result lines stream in one at a time with a soft fade
 *  - the body has a FIXED height and scrolls internally, so the page never
 *    shifts as content appears
 *
 * Implemented with a small reducer + timed scheduler instead of many
 * setIntervals so the animation stays in sync and is easy to reason about.
 */

const initial = { lineIndex: 0, typed: 0, lines: [] };

function reducer(state, action) {
  switch (action.type) {
    case "type":
      return { ...state, typed: state.typed + 1 };
    case "commit-prompt":
      return {
        ...state,
        lines: [TERMINAL_LINES[0]],
        lineIndex: 1,
        typed: 0,
      };
    case "next-line":
      return {
        ...state,
        lines: [...state.lines, TERMINAL_LINES[state.lineIndex]],
        lineIndex: state.lineIndex + 1,
      };
    default:
      return state;
  }
}

export default function Terminal() {
  const [state, dispatch] = useReducer(reducer, initial);
  const ref = useRef(null);
  const visible = useRef(true);

  // Pause animation when the terminal scrolls off screen.
  useEffect(() => {
    const node = ref.current;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), {
      threshold: 0.2,
    });
    if (node) io.observe(node);
    return () => io.disconnect();
  }, []);

  // The scheduler: drives typing, then line-by-line reveal, then restart.
  useEffect(() => {
    let timer;
    const promptText = TERMINAL_LINES[0].text;

    const tick = () => {
      if (!visible.current) {
        timer = setTimeout(tick, 200);
        return;
      }

      // Phase 1: typing the prompt
      if (state.lines.length === 0) {
        if (state.typed < promptText.length) {
          dispatch({ type: "type" });
          timer = setTimeout(tick, 24);
        } else {
          timer = setTimeout(() => dispatch({ type: "commit-prompt" }), 240);
        }
        return;
      }

      // Phase 2: revealing result lines
      if (state.lineIndex < TERMINAL_LINES.length) {
        const isStep = TERMINAL_LINES[state.lineIndex].type === "step";
        timer = setTimeout(() => dispatch({ type: "next-line" }), isStep ? 260 : 170);
        return;
      }

      // Phase 3: done — stay on the final state. It only replays on reload.
    };

    timer = setTimeout(tick, 120);
    return () => clearTimeout(timer);
  }, [state]);

  const typing = state.lines.length === 0;
  const promptText = TERMINAL_LINES[0].text;

  return (
    <div className="terminal" ref={ref}>
      <div className="terminal-bar">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <span className="terminal-title mono">nano-dev — zsh</span>
      </div>

      <div className="terminal-body mono">
        <div className="t-line t-banner">~/projects/demo · nano-dev v1.0.0</div>

        {typing ? (
          <div className="t-line t-prompt">
            <span className="t-caret">you ›</span> {promptText.slice(0, state.typed)}
            <span className="blink">▋</span>
          </div>
        ) : (
          <>
            {state.lines.map((line, i) => (
              <div key={i} className={`t-line t-appear ${colorByType[line.type]}`}>
                {line.type === "prompt" ? <span className="t-caret">you ›</span> : null}{" "}
                {line.text}
              </div>
            ))}
            {state.lineIndex >= TERMINAL_LINES.length ? (
              <div className="t-line t-idle">
                <span className="t-caret">you ›</span> <span className="blink">▋</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
