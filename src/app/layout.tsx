import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";

export const metadata: Metadata = {
  title: "급여관리 시스템",
  description: "사업장별 근로자 관리 및 4대보험 신고서 생성",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
