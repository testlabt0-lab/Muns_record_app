import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { StudyProvider, useStudy } from "@/lib/study-context";
import { AppLockProvider } from "@/lib/app-lock";
import { AppLockGate } from "@/components/app-lock-gate";
import { createTRPCClient, trpc } from "@/lib/trpc";
import { normalizeAppearanceMode } from "@/lib/appearance-preference";
import { ThemeProvider, useThemeContext } from "@/lib/theme-provider";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppLockProvider>
          <StudyProvider>
            <ThemeProvider><ThemedNavigator /></ThemeProvider>
          </StudyProvider>
        </AppLockProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function ThemedNavigator() {
  const { hydrated, syncSettings } = useStudy();
  const { colorScheme, setColorScheme } = useThemeContext();
  useEffect(() => {
    if (!hydrated) return;
    const preferred = normalizeAppearanceMode(syncSettings.appearanceMode);
    if (preferred !== colorScheme) setColorScheme(preferred);
  }, [colorScheme, hydrated, setColorScheme, syncSettings.appearanceMode]);
  return <><StatusBar style={colorScheme === "dark" ? "light" : "dark"} /><AppLockGate><Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}><Stack.Screen name="(tabs)" /><Stack.Screen name="year/[yearId]" /><Stack.Screen name="term/[termId]" /><Stack.Screen name="subject/[subjectId]" /><Stack.Screen name="record" options={{ presentation: "modal", animation: "slide_from_bottom" }} /><Stack.Screen name="lecture/[lectureId]" /><Stack.Screen name="storage" /><Stack.Screen name="follow-up-steps" /></Stack></AppLockGate></>;
}
