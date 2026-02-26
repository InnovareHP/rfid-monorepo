// Toast utility that uses dynamic import to avoid build-time resolution issues
// This matches the pattern used in src/components/ui/sonner.tsx

// Cache for the toast function
let toastCache: any = null;

// Lazy load sonner toast function using dynamic import
const loadToast = async () => {
  if (toastCache) return toastCache;

  try {
    // Use the same pattern as Toaster component - dynamic import with @vite-ignore
    // Construct module name dynamically so Vite doesn't try to resolve it at build time
    const moduleName = "son" + "ner";
    const sonnerModule = await import(/* @vite-ignore */ moduleName);
    if (sonnerModule?.toast) {
      toastCache = sonnerModule.toast;
      return toastCache;
    }
  } catch (error) {
    // sonner not available - will use console fallbacks
    console.warn(
      "sonner package not found. Toast notifications will use console fallbacks."
    );
  }

  // Fallback toast implementation
  toastCache = {
    success: (message: string) => {
      if (typeof window !== "undefined") {
        console.log(`✓ ${message}`);
      }
    },
    error: (message: string) => {
      if (typeof window !== "undefined") {
        console.error(`✗ ${message}`);
      }
    },
    info: (message: string) => {
      if (typeof window !== "undefined") {
        console.info(`ℹ ${message}`);
      }
    },
    warning: (message: string) => {
      if (typeof window !== "undefined") {
        console.warn(`⚠ ${message}`);
      }
    },
  };

  return toastCache;
};

// Pre-load toast in browser environment
if (typeof window !== "undefined") {
  loadToast();
}

// Export toast object with methods that work synchronously
export const toast = {
  success: (message: string) => {
    if (toastCache) {
      toastCache.success(message);
    } else {
      loadToast().then((t) => t.success(message));
    }
  },
  error: (message: string) => {
    if (toastCache) {
      toastCache.error(message);
    } else {
      loadToast().then((t) => t.error(message));
    }
  },
  info: (message: string) => {
    if (toastCache) {
      toastCache.info(message);
    } else {
      loadToast().then((t) => t.info(message));
    }
  },
  warning: (message: string) => {
    if (toastCache) {
      toastCache.warning(message);
    } else {
      loadToast().then((t) => t.warning(message));
    }
  },
};
