import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Star Speaker App",
  description:
    "Where professionals and speakers go to own their stage. Craft compelling speeches with AI-powered structure, rhetoric, and delivery guidance.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Star Speaker App",
    description:
      "Where professionals and speakers go to own their stage. Craft compelling speeches with AI-powered structure, rhetoric, and delivery guidance.",
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Star Speaker App",
    description:
      "Where professionals and speakers go to own their stage. Craft compelling speeches with AI-powered structure, rhetoric, and delivery guidance.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}