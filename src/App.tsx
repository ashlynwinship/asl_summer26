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
    <div id="navbar" className={visible ? "navbar-visible" : "navbar-hidden"}>
      <ul>
        <li>
          <Link to="/" className="title">
            ASL Live Dictionary
          </Link>
        </li>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/guide">User Guide</Link>
        </li>
        <li>
          <Link to="/results">Results</Link>
        </li>
      </ul>
    </div>
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
