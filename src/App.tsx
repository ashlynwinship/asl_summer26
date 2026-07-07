import { useState, useEffect, type ReactNode } from "react";
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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY <= 50) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <nav
      className={`sticky left-0 right-0 bg-neutral-dark transition-[top] duration-300 z-1000 ${
        visible ? "top-0" : "-top-12.5"
      }`}
    >
      <div className="list-none py-3.25 flex justify-between items-center bg-neutral-dark font-head">
        <Link to="/" className="text-white no-underline px-3 text-2xl">
          ASL Live Dictionary
        </Link>
        <div className="block">
          <Link
            to="/"
            className="text-white py-3.5 px-4 no-underline text-xl transition-colors hover:bg-neutral-darkest hover:py-3.25"
          >
            Home
          </Link>
          <Link
            to="/guide"
            className="text-white py-3.5 px-4 no-underline text-xl transition-colors hover:bg-neutral-darkest hover:py-3.25"
          >
            User Guide
          </Link>
        </div>
      </div>
    </nav>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}

type Header = {
  title: string;
  subtitle?: string;
  content?: ReactNode;
};

const headers: Record<string, Header> = {
  "/": {
    title: "Welcome to ASL Live Dictionary!",
    subtitle:
      "This is going to be content. Written here is a paragraph explaining an overview of the application, " +
      "as well as linking to the user guide. I am writing a bunch of stuff just so the paragraph looks good " +
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

type HeaderProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function Header({ collapsed, onToggle }: HeaderProps) {
  const location = useLocation();
  const header = headers[location.pathname] ?? headers["/"];

  return (
    <header
      className={`bg-neutral-panel text-center text-black relative transition-all duration-250 ease-in-out whitespace-pre-line ${
        collapsed ? "py-2 px-5 min-h-20" : "px-5 pt-10 pb-16"
      }`}
    >
      <button
        type="button"
        className="absolute right-5 bottom-5 font-button text-[15px] text-[#1f1f1f] bg-white border border-neutral-border rounded-full py-2 px-3.5 cursor-pointer shadow-sm hover:bg-[#f7f7f7]"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand header" : "Collapse header"}
      >
        {collapsed ? "▼ See more" : "▲ See less"}
      </button>
      {!collapsed && (
        <div className="flex flex-col items-center relative">
          <h1 className="font-head text-[50px] leading-tight m-0">
            {header.title}
          </h1>
          {header.subtitle && (
            <p className="font-head text-[25px] m-2.5 max-w-4xl">
              {header.subtitle}
            </p>
          )}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-neutral-dark text-white flex justify-center relative top-2.5 bottom-0 w-full py-4">
      <p>&copy; 2026 ASL Live Dictionary. All rights reserved.</p>
    </footer>
  );
}

export default function App() {
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header
        collapsed={headerCollapsed}
        onToggle={() => setHeaderCollapsed((isCollapsed) => !isCollapsed)}
      />
      <Navigation />
      <main className="w-[min(1450px,98%)] mx-auto box-border grid grid-rows-[auto_1fr_auto] min-h-dvh">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/results/:job_id" element={<Results />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
