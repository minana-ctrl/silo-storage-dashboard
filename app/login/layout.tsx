import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";

// Load Metropolis font family (Body font)
const metropolis = localFont({
  src: [
    {
      path: "../../fonts/metropolis/Metropolis-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/metropolis/Metropolis-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-metropolis",
  display: "swap",
});

// Load Robostic font (Heading font)
const robostic = localFont({
  src: "../../fonts/robostic/Robostic.otf",
  variable: "--font-robostic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Login - Silo Storage Dashboard",
  description: "Log in to Silo Storage Dashboard",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`h-screen overflow-hidden bg-background-white font-metropolis ${metropolis.variable} ${robostic.variable}`}>
      <div className="h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

