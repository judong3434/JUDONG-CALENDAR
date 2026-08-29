import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio",
  description: "카톡만큼 빠른 입력이 그 자리에서 일정이 되는 개인 일정 관리",
};

// 폰에서 그냥 열면 보이는 반응형 웹. 설치형(PWA) 아님.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 사용자가 확대할 수 있어야 한다. 접근성상 막지 않는다.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
