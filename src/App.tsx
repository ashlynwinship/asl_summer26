import { useState, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Guide from "./pages/Guide";
import Home from "./pages/Home";
import Results from "./pages/Results";

function Navigation() {
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  const handleScroll = () => {
    const currentScrollPos = window.pageYOffset;
    const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;
    setPrevScrollPos(currentScrollPos);
    setVisible(isVisible);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollPos]);
  return (
    <nav className={visible ? "nav-visible" : "nav-hidden"}>
      <div className="nav-inner">
        <Link to="/" className="nav-title">
          ASL Live Dictionary
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/guide">User Guide</Link>
          <Link to="/results">Results</Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer>
      <p>&copy; 2026 ASL Live Dictionary. All rights reserved.</p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
      <Footer />
    </BrowserRouter>
  );
}
