// Helper to format errors returned by API endpoints
// Returns a serializable object with safe fields for clients
export const formatErrorDetails = (error: unknown) => {
  const isProd = process.env.NODE_ENV === "production";

  if (error instanceof Error) {
    const base = {
      message: error.message || "An error occurred",
      name: error.name,
    } as { message: string; name?: string; code?: string | number; stack?: string };

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
    return { message: error };
  }

  if (typeof error === "object") {
    try {
      return { message: JSON.stringify(error) };
    } catch {
      return { message: "An object error occurred" };
    }
  }

  return { message: String(error) };
};

export default formatErrorDetails;
