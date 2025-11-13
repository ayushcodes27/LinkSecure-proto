import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative overflow-hidden transition-all duration-300 hover:bg-muted/50"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <Sun className={`h-4 w-4 transition-all duration-300 ${theme === "light" ? "rotate-0 scale-100" : "rotate-90 scale-0"}`} />
      <Moon className={`absolute h-4 w-4 transition-all duration-300 ${theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
    </Button>
  );
};

export default ThemeToggle;
