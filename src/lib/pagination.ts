export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export function parsePagination(
  params: Record<string, string | string[] | undefined>,
): { page: number; pageSize: number } {
  const rawPage = typeof params.page === 'string' ? Number(params.page) : 1;
  const rawSize =
    typeof params.limit === 'string' ? Number(params.limit) : DEFAULT_PAGE_SIZE;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}
