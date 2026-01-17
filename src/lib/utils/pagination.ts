export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 10,
  maxLimit = 100
): PaginationParams {
  let page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

  // Validate and sanitize
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), maxLimit);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function getSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultSort = '-createdAt'
): Record<string, 1 | -1> {
  const sortParam = searchParams.get('sort') || defaultSort;
  const sortFields = sortParam.split(',');
  const sort: Record<string, 1 | -1> = {};

  for (const field of sortFields) {
    const isDescending = field.startsWith('-');
    const fieldName = isDescending ? field.slice(1) : field;

    if (allowedFields.includes(fieldName)) {
      sort[fieldName] = isDescending ? -1 : 1;
    }
  }

  // Default sort if no valid fields
  if (Object.keys(sort).length === 0) {
    sort.createdAt = -1;
  }

  return sort;
}
