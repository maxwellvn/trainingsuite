// Test slugify utilities
// Note: We test only the basic slug generation since uuid functions require ESM mocking

describe('Slugify Utilities', () => {
  // Import inside describe to avoid ESM issues
  let createSlug: (text: string, addUniqueId?: boolean) => string;

  beforeAll(async () => {
    // Dynamic import to allow jest to properly mock
    const slugifyModule = await import('@/lib/utils/slugify');
    createSlug = slugifyModule.createSlug;
  });

  describe('createSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(createSlug('Hello World')).toBe('hello-world');
    });

    it('should handle special characters', () => {
      expect(createSlug('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(createSlug('Hello    World')).toBe('hello-world');
    });

    it('should handle accented characters', () => {
      expect(createSlug('Café Résumé')).toBe('cafe-resume');
    });

    it('should handle empty string', () => {
      expect(createSlug('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(createSlug('Course 101')).toBe('course-101');
    });

    it('should handle leading/trailing spaces', () => {
      expect(createSlug('  Test Course  ')).toBe('test-course');
    });

    it('should handle ampersand', () => {
      expect(createSlug('Salt & Pepper')).toBe('salt-and-pepper');
    });
  });
});

describe('Certificate Number Generation', () => {
  it('should generate certificate number with correct format', async () => {
    const { generateCertificateNumber } = await import('@/lib/utils/slugify');
    const certNumber = generateCertificateNumber();

    // Should start with CERT-
    expect(certNumber).toMatch(/^CERT-/);

    // Should have year-month format
    expect(certNumber).toMatch(/^CERT-\d{6}-/);

    // Should have random suffix
    expect(certNumber.length).toBeGreaterThan(15);
  });

  it('should generate unique certificate numbers', async () => {
    const { generateCertificateNumber } = await import('@/lib/utils/slugify');
    const numbers = new Set<string>();

    for (let i = 0; i < 10; i++) {
      numbers.add(generateCertificateNumber());
    }

    expect(numbers.size).toBe(10);
  });
});
