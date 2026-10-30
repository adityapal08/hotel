import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Red Roots Villa - Rejuvenate Your Inner Peace | Moratandi, Pondicherry",
  description:
    "Red Roots Villa - Your Perfect Getaway from hectic corporate life style. Minimalistic brand new 3BHK individual villa with private swimming pool in Moratandi - Pondicherry.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${playfair.variable} scroll-smooth scroll-pt-24 antialiased`}
    >
      <body className="font-sans min-h-screen bg-white text-zinc-800 flex flex-col selection:bg-[#df9700] selection:text-white">
        {children}
      </body>
    </html>
  );
}
