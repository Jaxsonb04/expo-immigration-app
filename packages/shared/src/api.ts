/** Standard API response envelope — see docs/ARCHITECTURE.md. */
export type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

/** Paginated envelope for list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
