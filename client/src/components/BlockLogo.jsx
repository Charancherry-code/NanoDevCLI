import "./BlockLogo.css";

/**
 * The same block-letter "NANO DEV" wordmark the CLI prints on launch,
 * rendered as crisp text art so the landing page feels native to the tool.
 */
const ART = [
  "███╗   ██╗ █████╗ ███╗   ██╗ ██████╗     ██████╗ ███████╗██╗   ██╗",
  "████╗  ██║██╔══██╗████╗  ██║██╔═══██╗    ██╔══██╗██╔════╝██║   ██║",
  "██╔██╗ ██║███████║██╔██╗ ██║██║   ██║    ██║  ██║█████╗  ██║   ██║",
  "██║╚██╗██║██╔══██║██║╚██╗██║██║   ██║    ██║  ██║██╔══╝  ╚██╗ ██╔╝",
  "██║ ╚████║██║  ██║██║ ╚████║╚██████╔╝    ██████╔╝███████╗ ╚████╔╝ ",
  "╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝     ╚═════╝ ╚══════╝  ╚═══╝  ",
];

export default function BlockLogo() {
  return (
    <pre className="block-logo mono" aria-label="nano-dev">
      {ART.join("\n")}
    </pre>
  );
}
