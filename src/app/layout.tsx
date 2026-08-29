import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QuickCapture } from "@/components/QuickCapture";
import { Nav } from "@/components/Nav";
import { listProjectOptions } from "@/lib/db/queries/project";

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

// 여기서 DB 를 읽으므로 정적으로 굳으면 안 된다.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Quick Capture 는 layout 에 있다 — "입력창은 앱 어디에서나 열린다"(기획서 §2 원칙 하나).
  // 캘린더를 보다가도 Space 한 번이면 바로 던질 수 있어야 한다.
  const projects = listProjectOptions();

  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">
        <QuickCapture projects={projects} nav={<Nav />} />
        {children}
      </body>
    </html>
  );
}
