import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Hero from "./sections/Hero.jsx";
import Features from "./sections/Features.jsx";
import HowItWorks from "./sections/HowItWorks.jsx";
import Commands from "./sections/Commands.jsx";
import Install from "./sections/Install.jsx";
import { useReveal } from "./hooks/useReveal.js";
import { useSmoothScroll } from "./hooks/useSmoothScroll.js";

export default function App() {
  useReveal();
  useSmoothScroll();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Commands />
        <Install />
      </main>
      <Footer />
    </>
  );
}
