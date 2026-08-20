import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const LOCK_ENABLED_KEY = "muhadir.app-lock.enabled";

type AppLockContextValue = {
  loading: boolean;
  enabled: boolean;
  locked: boolean;
  supported: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  unlock: () => Promise<boolean>;
  lockNow: () => void;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

async function authenticate(promptMessage: string) {
  if (Platform.OS === "web") throw new Error("قفل الجهاز غير متاح في نسخة الويب.");
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) throw new Error("لا يدعم هذا الجهاز المصادقة المحلية.");
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "إلغاء",
    disableDeviceFallback: false,
  });
  if (!result.success) throw new Error(result.error === "user_cancel" ? "أُلغي التحقق من هوية الجهاز." : "تعذر التحقق من هوية الجهاز.");
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const enabledRef = useRef(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (Platform.OS === "web") { if (active) setLoading(false); return; }
      try {
        const stored = await SecureStore.getItemAsync(LOCK_ENABLED_KEY);
        if (active && stored === "true") { setEnabled(true); setLocked(true); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if ((nextState === "inactive" || nextState === "background") && enabledRef.current) setLocked(true);
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<AppLockContextValue>(() => ({
    loading,
    enabled,
    locked,
    supported: Platform.OS !== "web",
    enable: async () => {
      await authenticate("فعّل قفل مُحاضِر باستخدام قفل جهازك");
      await SecureStore.setItemAsync(LOCK_ENABLED_KEY, "true");
      setEnabled(true);
      setLocked(false);
    },
    disable: async () => {
      if (enabled) await authenticate("أكد إيقاف قفل مُحاضِر");
      await SecureStore.deleteItemAsync(LOCK_ENABLED_KEY);
      setEnabled(false);
      setLocked(false);
    },
    unlock: async () => {
      try {
        await authenticate("افتح مُحاضِر");
        setLocked(false);
        return true;
      } catch { return false; }
    },
    lockNow: () => { if (enabled) setLocked(true); },
  }), [enabled, loading, locked]);

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) throw new Error("يجب استخدام useAppLock داخل AppLockProvider.");
  return context;
}
