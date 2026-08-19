import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { StudyProvider } from "@/lib/study-context";
import { createTRPCClient, trpc } from "@/lib/trpc";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StudyProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="year/[yearId]" />
            <Stack.Screen name="term/[termId]" />
            <Stack.Screen name="subject/[subjectId]" />
            <Stack.Screen name="record" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="lecture/[lectureId]" />
            <Stack.Screen name="storage" />
          </Stack>
        </StudyProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
