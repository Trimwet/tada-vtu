// Simplified auth helpers - no caching, just simple utility functions

/**
 * Check if we're running on the client
 */
export function isClient(): boolean {
  return typeof window !== "undefined";
}

/**
 * Clear any stored auth data (for logout)
 */
export function clearAuthData() {
  if (!isClient()) return;
  
  try {
    sessionStorage.removeItem("tada_auth");
    localStorage.removeItem("tada_auth");
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
}
