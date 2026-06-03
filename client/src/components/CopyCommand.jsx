import { useState } from "react";
import "./CopyCommand.css";

/**
 * A pill showing a shell command with a copy-to-clipboard button.
 */
export default function CopyCommand({ command }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  return (
    <button className="copy-cmd mono" onClick={copy} aria-label="Copy install command">
      <span className="copy-prompt">$</span>
      <span className="copy-text">{command}</span>
      <span className={`copy-state ${copied ? "ok" : ""}`}>
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
