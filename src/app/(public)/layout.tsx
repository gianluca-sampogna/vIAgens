import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "../../styles/globals.css";
import { Header } from "@/src/components/Header";

const roboto = Roboto({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Página inicial",
  description: "Teste com next",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={roboto.className}>
      <Header />
      <body>{children}</body>
    </html>
  );
}
