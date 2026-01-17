import { getPaginationParams, getSortParams } from '@/lib/utils/pagination';

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should return default values when no params provided', () => {
      const searchParams = new URLSearchParams();
      const result = getPaginationParams(searchParams);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should parse page and limit from params', () => {
      const searchParams = new URLSearchParams('page=3&limit=20');
      const result = getPaginationParams(searchParams);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(40);
    });

    it('should enforce minimum page of 1', () => {
      const searchParams = new URLSearchParams('page=0');
      const result = getPaginationParams(searchParams);

      expect(result.page).toBe(1);
    });

    it('should enforce minimum limit of 1', () => {
      const searchParams = new URLSearchParams('limit=0');
      const result = getPaginationParams(searchParams);

      expect(result.limit).toBe(1);
    });

    it('should enforce maximum limit of 100', () => {
      const searchParams = new URLSearchParams('limit=200');
      const result = getPaginationParams(searchParams);

      expect(result.limit).toBe(100);
    });

    it('should use custom default limit', () => {
      const searchParams = new URLSearchParams();
      const result = getPaginationParams(searchParams, 25);

      expect(result.limit).toBe(25);
    });

    it('should calculate skip correctly', () => {
      const searchParams = new URLSearchParams('page=5&limit=10');
      const result = getPaginationParams(searchParams);

      expect(result.skip).toBe(40); // (5-1) * 10
    });
  });

  describe('getSortParams', () => {
    const allowedFields = ['title', 'price', 'createdAt', 'updatedAt'];

    it('should return default sort when no params provided', () => {
      const searchParams = new URLSearchParams();
      const result = getSortParams(searchParams, allowedFields);

      expect(result).toEqual({ createdAt: -1 });
    });

    it('should parse sort field', () => {
      const searchParams = new URLSearchParams('sort=-title');
      const result = getSortParams(searchParams, allowedFields);

      expect(result).toEqual({ title: -1 });
    });

    it('should handle ascending order', () => {
      const searchParams = new URLSearchParams('sort=title');
      const result = getSortParams(searchParams, allowedFields);

      expect(result).toEqual({ title: 1 });
    });

    it('should handle descending order', () => {
      const searchParams = new URLSearchParams('sort=-price');
      const result = getSortParams(searchParams, allowedFields);

      expect(result).toEqual({ price: -1 });
    });

    it('should ignore fields not in allowed list', () => {
      const searchParams = new URLSearchParams('sort=-invalidField');
      const result = getSortParams(searchParams, allowedFields);

      // Falls back to default sort
      expect(result).toEqual({ createdAt: -1 });
    });

    it('should handle multiple sort fields', () => {
      const searchParams = new URLSearchParams('sort=-createdAt,title');
      const result = getSortParams(searchParams, allowedFields);

      expect(result).toEqual({ createdAt: -1, title: 1 });
    });
  });
});
