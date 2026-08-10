import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const host = forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : host.startsWith("localhost")
      ? "http"
      : "https";
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: "CrossSignal · Revenue Flight Recorder",
    description:
      "Turn scattered business signals into inspectable, approved, and measured decisions.",
    openGraph: {
      title: "CrossSignal · Revenue Flight Recorder",
      description: "From signal to measured decision.",
      type: "website",
      images: [{ url: socialImage, width: 1734, height: 907, alt: "CrossSignal revenue flight recorder" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "CrossSignal · Revenue Flight Recorder",
      description: "From signal to measured decision.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
