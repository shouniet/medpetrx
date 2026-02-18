import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import ClientOnly from "./client-only";

export const metadata: Metadata = {
  title: "MedPetRx",
  description: "Veterinary medical record hub for pet owners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        <ClientOnly>
          <Providers>{children}</Providers>
        </ClientOnly>
      </body>
    </html>
  );
}
