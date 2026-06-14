export function isDebugPickEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (localStorage.getItem("debugPick") === "1") return true;
  return new URLSearchParams(window.location.search).get("debugPick") === "1";
}
