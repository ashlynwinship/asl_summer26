import { useState, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
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
      className={`sticky left-0 right-0 bg-gray-300 transition-[top] duration-300 z-1000 ${
        visible ? "top-0" : "-top-14"
      }`}
    >
      <div className="list-none py-3 flex justify-between items-center font-head">
        <Link to="/" className="text-brand-alt no-underline px-3 text-2xl">
          ASL Live Dictionary
        </Link>
        <div className="block">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `py-3.5 px-4 no-underline text-xl transition-colors ${
                isActive
                  ? "bg-brand-alt text-white"
                  : "text-black hover:bg-brand-alt hover:text-white"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `py-3.5 px-4 no-underline text-xl transition-colors ${
                isActive
                  ? "bg-brand-alt text-white"
                  : "text-black hover:bg-brand-alt hover:text-white"
              }`
            }
          >
            User Guide
          </NavLink>
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

function Footer() {
  return (
    <footer className="bg-neutral-dark text-white flex justify-center relative top-2.5 bottom-0 w-full py-4">
      <p>&copy; 2026 ASL Live Dictionary. All rights reserved.</p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navigation />
      <main className="mx-auto box-border grid grid-rows-[auto_1fr_auto] min-h-dvh">
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
