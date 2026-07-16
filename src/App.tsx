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
  image?: string;
  title: string;
  subtitle?: string;
  content?: ReactNode;
};

const headers: Record<string, Header> = {
  "/": {
    image: "/ASLWELCOMEIMAGE.PNG",
    title: "To ASL Live Dictionary!",
  },
};

function Header() {
  const location = useLocation();
  if (location.pathname !== "/") {
    return null;
  }

  const header = headers[location.pathname] ?? headers["/"];

  return (
    <header className="bg-neutral-panel text-center text-black relative transition-all duration-250 ease-in-out whitespace-pre-line px-2 pt-2 pb-10">
      <div className="flex flex-col items-center relative">
        {header.image && (
          <div className="mt-6">
            <img
              src={header.image}
              alt="Header visual"
              className="rounded-lg"
            />
          </div>
        )}
        <h1 className="font-head text-[50px] leading-tight mt-2">
          {header.title}
        </h1>
      </div>
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
      <Header />
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
