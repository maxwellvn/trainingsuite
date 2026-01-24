import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

/**
 * Fetches video duration by reading the video metadata from the URL.
 * This bypasses CORS restrictions since it runs server-side.
 */
async function getVideoDurationFromUrl(url: string): Promise<number | null> {
  try {
    // First, try a HEAD request to check if the URL is accessible
    const headResponse = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrainingSuite/1.0)',
      },
      redirect: 'follow',
    });

    if (!headResponse.ok) {
      console.log(`HEAD request failed with status: ${headResponse.status}`);
      return null;
    }

    const contentType = headResponse.headers.get('content-type') || '';
    
    // Check if it's a video
    if (!contentType.includes('video') && !url.match(/\.(mp4|webm|mov|avi|mkv|m3u8)(\?|$)/i)) {
      console.log(`Not a video content type: ${contentType}`);
      return null;
    }

    // For MP4 files, we can try to read the moov atom to get duration
    // This requires reading parts of the file
    const duration = await extractMp4Duration(url);
    
    if (duration !== null) {
      return duration;
    }

    // Fallback: Try to get duration from content-length and estimate
    // This is very rough and not reliable
    return null;
  } catch (error) {
    console.error('Error fetching video duration:', error);
    return null;
  }
}

/**
 * Extract duration from MP4 file by reading the moov/mvhd atom.
 * MP4 files store duration in the movie header (mvhd) atom.
 */
async function extractMp4Duration(url: string): Promise<number | null> {
  try {
    // Read the first 50MB max (moov atom is usually at the start or end)
    // First try reading from the start
    let duration = await tryExtractFromRange(url, 0, 1024 * 1024); // First 1MB
    
    if (duration !== null) {
      return duration;
    }

    // If moov atom not at start, try reading from end (some MP4s have moov at end)
    // Get file size first
    const headResponse = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const contentLength = headResponse.headers.get('content-length');
    
    if (contentLength) {
      const fileSize = parseInt(contentLength, 10);
      if (fileSize > 1024 * 1024) {
        // Try last 1MB
        duration = await tryExtractFromRange(url, fileSize - 1024 * 1024, fileSize - 1);
        if (duration !== null) {
          return duration;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting MP4 duration:', error);
    return null;
  }
}

async function tryExtractFromRange(url: string, start: number, end: number): Promise<number | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': `bytes=${start}-${end}`,
        'User-Agent': 'Mozilla/5.0 (compatible; TrainingSuite/1.0)',
      },
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      // Server doesn't support range requests, try full request with small timeout
      if (start === 0) {
        const fullResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TrainingSuite/1.0)',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (!fullResponse.ok) return null;
        
        const buffer = await fullResponse.arrayBuffer();
        return parseMp4Duration(new Uint8Array(buffer));
      }
      return null;
    }

    const buffer = await response.arrayBuffer();
    return parseMp4Duration(new Uint8Array(buffer));
  } catch (error) {
    console.error('Error fetching range:', error);
    return null;
  }
}

/**
 * Parse MP4 buffer to find mvhd atom and extract duration.
 */
function parseMp4Duration(data: Uint8Array): number | null {
  try {
    // Search for 'mvhd' atom
    const mvhdIndex = findAtom(data, 'mvhd');
    
    if (mvhdIndex === -1) {
      // Try to find moov first, then mvhd inside it
      const moovIndex = findAtom(data, 'moov');
      if (moovIndex === -1) {
        return null;
      }
      
      // Search for mvhd within moov
      const moovData = data.slice(moovIndex);
      const mvhdInMoov = findAtom(moovData, 'mvhd');
      if (mvhdInMoov === -1) {
        return null;
      }
      
      return extractDurationFromMvhd(moovData.slice(mvhdInMoov));
    }
    
    return extractDurationFromMvhd(data.slice(mvhdIndex));
  } catch (error) {
    console.error('Error parsing MP4:', error);
    return null;
  }
}

function findAtom(data: Uint8Array, atomName: string): number {
  const atomBytes = new TextEncoder().encode(atomName);
  
  for (let i = 0; i < data.length - 8; i++) {
    let found = true;
    for (let j = 0; j < 4; j++) {
      if (data[i + 4 + j] !== atomBytes[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  
  return -1;
}

function extractDurationFromMvhd(mvhdData: Uint8Array): number | null {
  try {
    // mvhd structure:
    // 4 bytes: size
    // 4 bytes: 'mvhd'
    // 1 byte: version (0 or 1)
    // 3 bytes: flags
    // if version 0: 4 bytes creation time, 4 bytes modification time, 4 bytes timescale, 4 bytes duration
    // if version 1: 8 bytes creation time, 8 bytes modification time, 4 bytes timescale, 8 bytes duration
    
    if (mvhdData.length < 20) return null;
    
    const version = mvhdData[8];
    
    let timescale: number;
    let duration: number;
    
    if (version === 0) {
      // 32-bit values
      timescale = readUInt32BE(mvhdData, 20);
      duration = readUInt32BE(mvhdData, 24);
    } else {
      // 64-bit values
      timescale = readUInt32BE(mvhdData, 28);
      // Read 64-bit duration (we only use lower 32 bits for simplicity)
      duration = readUInt32BE(mvhdData, 36);
    }
    
    if (timescale === 0) return null;
    
    // Convert to minutes
    const seconds = duration / timescale;
    const minutes = Math.round(seconds / 60);
    
    return minutes > 0 ? minutes : 1;
  } catch (error) {
    console.error('Error extracting duration from mvhd:', error);
    return null;
  }
}

function readUInt32BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
}

// POST handler
async function postHandler(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return errorResponse('URL is required', 400);
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return errorResponse('Invalid URL format', 400);
    }

    // Skip YouTube and Vimeo - they require API integration
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
      return errorResponse('YouTube and Vimeo URLs require API integration', 400);
    }

    const duration = await getVideoDurationFromUrl(url);

    if (duration === null) {
      return errorResponse('Could not extract video duration. The video may be inaccessible or in an unsupported format.', 422);
    }

    return successResponse({ duration }, 'Duration extracted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, postHandler);
}
