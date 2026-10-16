"use client";

import { ReactNode } from "react";
import { AppTopBar, AppTopBarProps } from "../AppTopBar/AppTopBar";

type AppLayoutProps = AppTopBarProps & {
  children: ReactNode;
  className: string;
};

export function AppLayout({ children, className, ...topBarProps }: AppLayoutProps) {
  return (
    <main className={className}>
      <AppTopBar {...topBarProps} />
      {children}
    </main>
  );
}
