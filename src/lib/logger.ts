import { consola } from "consola";

// Configure consola based on environment
if (process.env.NEXT_PUBLIC_NODE_ENV === "development") {
  // In development, show debug level and above
  consola.level = 4; // debug level
} else if (process.env.NEXT_PUBLIC_NODE_ENV === "production") {
  // In production, only show warnings and errors
  consola.level = 2; // warn level
} else {
  // Default fallback for other environments
  consola.level = 3; // info level
}

// Export configured consola instance
export { consola };