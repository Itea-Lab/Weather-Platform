import { useEffect } from "react";

/**
 * Custom hook to set the page title dynamically
 * @param title - The title to set for the page
 * @param suffix - Optional suffix to append (defaults to " | Weather Platform")
 */
export function usePageTitle(
  title: string,
  suffix: string = " | Weather Platform"
) {
  useEffect(() => {
    const fullTitle = title + suffix;
    document.title = fullTitle;

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = "Weather Platform";
    };
  }, [title, suffix]);
}

/**
 * Hook for setting page title with description (for accessibility)
 * @param title - The title to set for the page
 * @param description - The description for the page
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    // Set title
    document.title = title + " | Weather Platform";

    // Set description if provided
    if (description) {
      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription) {
        metaDescription.setAttribute("content", description);
      } else {
        // Create meta description if it doesn't exist
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = description;
        document.head.appendChild(meta);
      }
    }

    // Cleanup function
    return () => {
      document.title = "Weather Platform";
    };
  }, [title, description]);
}
