import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
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
        </div>
      </div>
    </nav>
  );
}

type Header = {
  title: string;
  subtitle?: string;
  content?: React.ReactNode;
};

const headers: Record<string, Header> = {
  "/": {
    title: "Welcome to ASL Live Dictionary!",
    subtitle:
      "This is going to be content. Written here is a paragraph explaining an overview of the application, " +
      "as well as linking to the user guide. I am writing a bunch of stuff just so the paragraph looks good" +
      "and fills up the space. This is just a placeholder for now, but it will be replaced with actual content later on.",
  },
  "/guide": {
    title: "User Guide",
    subtitle: "Learn how to film and submit a clear recording.",
  },
  "/results": {
    title: "Results",
    subtitle: "Review your top matches and their feature breakdown.",
  },
};

function Header() {
  const location = useLocation();
  const header = headers[location.pathname] ?? headers["/"];

  return (
    <header className="header" style={{ whiteSpace: "pre-line" }}>
      <h1 style={{ fontSize: "50px" }}>{header.title}</h1>
      {header.subtitle && <p style={{ fontSize: "25px" }}>{header.subtitle}</p>}
    </header>
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
      <Header />
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
