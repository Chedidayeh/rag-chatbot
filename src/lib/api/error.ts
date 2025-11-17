// Helper to format errors returned by API endpoints
// Returns a serializable object with safe fields for clients
export const formatErrorDetails = (error: unknown) => {
  const isProd = process.env.NODE_ENV === "production";

  if (error instanceof Error) {
    const base = {
      message: error.message || "An error occurred",
      name: error.name,
      type: "error",
    } as { message: string; name?: string; code?: string | number; stack?: string; type: string };

    // Attach code if present (some libs attach .code)
    const maybeErrorWithCode = error as { code?: string | number };
    if (maybeErrorWithCode && maybeErrorWithCode.code) {
      base.code = maybeErrorWithCode.code;
    }

    // Only include stack in non-production for debugging
    if (!isProd && error.stack) {
      base.stack = error.stack;
    }

    return base;
  }

  // If it's a string or plain object, coerce to a message
  if (typeof error === "string") {
    return { message: error, type: "error" };
  }

  if (typeof error === "object") {
    try {
      return { message: JSON.stringify(error), type: "error" };
    } catch {
      return { message: "An object error occurred", type: "error" };
    }
  }

  return { message: String(error), type: "error" };
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message || "";
    
    // Check for specific error types
    if (msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("overloaded")) {
      return "The AI service is currently overloaded. Please try again in a few moments.";
    }
    if (msg.includes("429") || msg.includes("rate limit")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("authentication")) {
      return "Authentication failed. Please check your API keys.";
    }
    if (msg.includes("404") || msg.includes("not found")) {
      return "Resource not found. Please check your input.";
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("ECONNREFUSED")) {
      return "Network error. Please check your connection and try again.";
    }
    if (msg.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    
    return msg;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An error occurred. Please try again.";
};

export default formatErrorDetails;
