import { useState, useEffect } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
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
        <li className="title">ASL Live Dictionary</li>
        <li>
          <NavLink to="/">Home</NavLink>
        </li>
        <li>
          <NavLink to="/guide">User Guide</NavLink>
        </li>
        <li>
          <NavLink to="/results">Results</NavLink>
        </li>
      </ul>
    </div>
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
    </BrowserRouter>
  );
}
