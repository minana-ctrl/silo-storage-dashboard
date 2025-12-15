import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ConditionalSidebar from "@/components/ConditionalSidebar";
import MainContent from "@/components/MainContent";

// Load Metropolis font family (Body font)
const metropolis = localFont({
  src: [
    {
      path: "../fonts/metropolis/Metropolis-Thin.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-ThinItalic.otf",
      weight: "100",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-ExtraLight.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-ExtraLightItalic.otf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-SemiBoldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-ExtraBold.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-ExtraBoldItalic.otf",
      weight: "800",
      style: "italic",
    },
    {
      path: "../fonts/metropolis/Metropolis-Black.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../fonts/metropolis/Metropolis-BlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-metropolis",
  display: "swap",
});

// Load Robostic font (Heading font)
const robostic = localFont({
  src: "../fonts/robostic/Robostic.otf",
  variable: "--font-robostic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Silo Storage Dashboard",
  description: "AI Agent Analytics and Conversation Monitoring",
  icons: {
    icon: "/favicon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${metropolis.variable} ${robostic.variable}`}>
      <body className="h-screen overflow-hidden">
        <ConditionalSidebar />
        <MainContent>{children}</MainContent>
      </body>
    </html>
  );
}

