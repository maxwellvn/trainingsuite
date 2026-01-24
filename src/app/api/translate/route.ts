import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_TTL } from '@/lib/redis';
import crypto from 'crypto';

// Supported language codes - comprehensive list matching frontend
const SUPPORTED_LANGUAGE_CODES = new Set([
  // Major World Languages
  'en', 'zh', 'es', 'hi', 'ar', 'pt', 'bn', 'ru', 'ja', 'pa',
  // European Languages
  'de', 'fr', 'it', 'nl', 'pl', 'uk', 'ro', 'el', 'cs', 'sv',
  'hu', 'fi', 'da', 'no', 'sk', 'bg', 'hr', 'sr', 'sl', 'lt',
  'lv', 'et', 'is', 'ga', 'cy', 'mt', 'sq', 'mk', 'bs', 'lb',
  'ca', 'gl', 'eu',
  // Asian Languages
  'ko', 'vi', 'th', 'id', 'ms', 'tl', 'ta', 'te', 'mr', 'gu',
  'kn', 'ml', 'or', 'si', 'ne', 'my', 'km', 'lo', 'mn', 'ka',
  'hy', 'az', 'kk', 'uz', 'ky', 'tg', 'tk',
  // Middle Eastern Languages
  'tr', 'fa', 'he', 'ur', 'ps', 'ku',
  // African Languages
  'sw', 'am', 'ha', 'yo', 'ig', 'zu', 'xh', 'af', 'st', 'sn',
  'rw', 'so', 'mg', 'ny', 'lg', 'ti', 'om', 'wo', 'ee', 'tw',
  'ak', 'bm', 'ln', 'kg', 'rn',
  // Other Languages
  'eo', 'la', 'jv', 'su', 'ceb', 'ht', 'haw', 'mi', 'sm', 'gd',
  'yi', 'hmn', 'co', 'fy',
]);

// Rate limiting - track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Generate cache key for translation
function getTranslationCacheKey(text: string, from: string, to: string): string {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  return `translation:${from}:${to}:${hash}`;
}

// Call MyMemory Translation API
async function translateWithMyMemory(text: string, from: string, to: string): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${from}|${to}`,
    de: 'training@movortech.com', // Contact email for higher limits
  });

  const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
  
  if (!response.ok) {
    throw new Error(`MyMemory API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'Translation failed');
  }

  return data.responseData.translatedText;
}

// Batch translate multiple texts
async function translateBatch(
  texts: string[], 
  from: string, 
  to: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const toTranslate: string[] = [];
  
  // Check cache first for each text
  for (const text of texts) {
    if (!text.trim()) {
      results.set(text, text);
      continue;
    }
    
    const cacheKey = getTranslationCacheKey(text, from, to);
    const cached = await cache.get<string>(cacheKey);
    
    if (cached) {
      results.set(text, cached);
    } else {
      toTranslate.push(text);
    }
  }
  
  // Translate uncached texts (in parallel, but limited)
  const BATCH_SIZE = 5;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (text) => {
        try {
          const translated = await translateWithMyMemory(text, from, to);
          results.set(text, translated);
          
          // Cache the translation (90 days)
          const cacheKey = getTranslationCacheKey(text, from, to);
          await cache.set(cacheKey, translated, 90 * 24 * 60 * 60);
        } catch (error) {
          console.error(`Failed to translate: ${text.substring(0, 50)}...`, error);
          results.set(text, text); // Return original on error
        }
      })
    );
    
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < toTranslate.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// GET - Get supported languages
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      languages: Array.from(SUPPORTED_LANGUAGE_CODES),
      defaultLanguage: 'en',
    },
  });
}

// POST - Translate text(s)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { texts, text, from = 'en', to } = body;

    // Validate target language
    if (!to || !SUPPORTED_LANGUAGE_CODES.has(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing target language' },
        { status: 400 }
      );
    }

    // If source and target are the same, return original
    if (from === to) {
      if (texts) {
        const results: Record<string, string> = {};
        texts.forEach((t: string) => results[t] = t);
        return NextResponse.json({ success: true, data: { translations: results } });
      }
      return NextResponse.json({ success: true, data: { translation: text } });
    }

    // Handle batch translation
    if (texts && Array.isArray(texts)) {
      if (texts.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Maximum 50 texts per request' },
          { status: 400 }
        );
      }

      const translations = await translateBatch(texts, from, to);
      const results: Record<string, string> = {};
      translations.forEach((value, key) => results[key] = value);

      return NextResponse.json({
        success: true,
        data: { translations: results },
      });
    }

    // Handle single text translation
    if (text && typeof text === 'string') {
      if (text.length > 5000) {
        return NextResponse.json(
          { success: false, error: 'Text too long. Maximum 5000 characters.' },
          { status: 400 }
        );
      }

      // Check cache
      const cacheKey = getTranslationCacheKey(text, from, to);
      const cached = await cache.get<string>(cacheKey);
      
      if (cached) {
        return NextResponse.json({
          success: true,
          data: { translation: cached, cached: true },
        });
      }

      // Translate
      const translation = await translateWithMyMemory(text, from, to);
      
      // Cache for 90 days
      await cache.set(cacheKey, translation, 90 * 24 * 60 * 60);

      return NextResponse.json({
        success: true,
        data: { translation, cached: false },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing text or texts parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { success: false, error: 'Translation service unavailable' },
      { status: 500 }
    );
  }
}
