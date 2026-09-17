import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel | vIAgens",
  description: "Gerencie suas viagens e tarefas",
};

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}
