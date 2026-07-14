/**
 * design-sync preview stub for expo-router. The synced components only call
 * useRouter() for navigation side effects, which never fire in a static
 * preview card — this keeps the whole router out of the web bundle.
 */
export function useRouter() {
  return {
    back: () => {},
    push: (_href: unknown) => {},
    replace: (_href: unknown) => {},
    navigate: (_href: unknown) => {},
    dismiss: () => {},
    dismissAll: () => {},
    canGoBack: () => true,
    canDismiss: () => false,
    setParams: (_params: unknown) => {},
  };
}
