import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with clsx and resolves Tailwind CSS class conflicts using twMerge.
 *
 * @param {...any} inputs - Class names, expressions, arrays, or objects
 * @returns {string} - Merged class name string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
