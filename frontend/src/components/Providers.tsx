"use client";

import { Provider } from "jotai";
import { AuthProvider } from "./auth/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
