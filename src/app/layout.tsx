import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/providers/session-provider";
import { Header } from "@/components/Header";

const roboto = Roboto({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "vIAgens | Planejador de Viagens com Inteligência Artificial",
    template: "%s | vIAgens",
  },
  description:
    "Planeje suas viagens dos sonhos com inteligência artificial. Monte roteiros personalizados, descubra novos destinos, calcule custos e compartilhe dicas com mais de 7 mil viajantes.",
  keywords: [
    "planejador de viagens",
    "inteligência artificial viagens",
    "roteiro de viagem",
    "dicas de viagem",
    "turismo inteligente",
    "comunidade de viajantes",
    "viagens",
    "vIAgens",
  ],
  authors: [{ name: "vIAgens" }],
  creator: "vIAgens",
  publisher: "vIAgens",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: appUrl,
    siteName: "vIAgens",
    title: "vIAgens | Planejador de Viagens com Inteligência Artificial",
    description:
      "Monte roteiros personalizados, descubra novos destinos e planeje sua próxima viagem com inteligência artificial.",
    images: [
      {
        url: "/assets/aviao.svg",
        width: 1200,
        height: 630,
        alt: "vIAgens - Sistema de Planejamento de Viagens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "vIAgens | Planejador de Viagens com IA",
    description:
      "Monte roteiros personalizados e descubra novos destinos com inteligência artificial.",
    images: ["/assets/aviao.svg"],
  },
  alternates: {
    canonical: "./",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={roboto.className}>
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
