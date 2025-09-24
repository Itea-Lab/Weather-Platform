/**
 * Shared utilities for SWR API hooks
 * Consolidates common patterns for error handling, retries, and configuration
 */

import useSWR, { SWRConfiguration } from "swr";

/**
 * Standard error normalization for API hooks
 */
export function normalizeError(error: unknown): Error | null {
  if (!error) return null;
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Standard SWR retry configuration
 */
export function createRetryConfig(
  options: {
    maxRetries?: number;
    retryDelayMs?: number;
    skipStatusCodes?: number[];
  } = {}
): SWRConfiguration["onErrorRetry"] {
  const {
    maxRetries = 3,
    retryDelayMs = 5000,
    skipStatusCodes = [404, 401],
  } = options;

  return (error, key, config, revalidate, { retryCount }) => {
    // Don't retry on specified status codes or max retries reached
    if (skipStatusCodes.includes(error.status) || retryCount >= maxRetries) {
      return;
    }

    // Retry after delay
    setTimeout(() => revalidate({ retryCount }), retryDelayMs);
  };
}

/**
 * Standard SWR configuration for API hooks
 */
export function createSWRConfig(
  overrides: SWRConfiguration = {}
): SWRConfiguration {
  return {
    onErrorRetry: createRetryConfig(),
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    ...overrides,
  };
}

/**
 * Standard API hook return type
 */
export interface APIHookResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  mutate: () => void;
}

/**
 * Enhanced API hook return with additional common fields
 */
export interface EnhancedAPIHookResult<T> extends APIHookResult<T> {
  success: boolean;
  hasData: boolean;
}

/**
 * Create a standardized API hook with consistent error handling and configuration
 */
export function createAPIHook<T>(
  key: string | (() => string | null),
  fetcher: (url: string) => Promise<T>,
  config: {
    fallbackData?: T;
    refreshInterval?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    skipStatusCodes?: number[];
  } = {}
): () => APIHookResult<T> {
  return () => {
    const {
      fallbackData,
      refreshInterval = 0,
      maxRetries = 3,
      retryDelayMs = 5000,
      skipStatusCodes = [404, 401],
    } = config;

    const { data, error, isLoading, mutate } = useSWR<T>(
      key,
      fetcher,
      createSWRConfig({
        fallbackData,
        refreshInterval,
        onErrorRetry: createRetryConfig({
          maxRetries,
          retryDelayMs,
          skipStatusCodes,
        }),
      })
    );

    return {
      data,
      error: normalizeError(error),
      isLoading,
      mutate,
    };
  };
}

/**
 * Generic fetcher for GET requests with standard error handling
 */
export const standardFetcher = async (url: string) => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      headers,
      credentials: "include", // This sends cookies automatically
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: res.statusText }));
      const error = new Error(
        errorData.error || "API request failed"
      ) as Error & { status: number };
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (error) {
    throw error;
  }
};
