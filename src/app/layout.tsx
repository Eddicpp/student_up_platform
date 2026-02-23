import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ✅ IMPORTA IL PROVIDER (Assicurati che il percorso sia corretto: @/app/context/UserContext)
import { UserProvider } from "@/app/context/UserContext"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudentUP - UniPD",
  description: "Trova il tuo team, realizza il tuo sogno.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ✅ AVVOLGI TUTTO COL PROVIDER */}
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}