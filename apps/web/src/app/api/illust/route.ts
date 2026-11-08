import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPixivArtwork,
  extractIllustId,
  PixivValidationError,
  PixivNotFoundError,
  PixivRateLimitError,
  PixivAuthError,
  PixivApiError,
} from '@/lib/pixiv';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawInput = searchParams.get('target') || searchParams.get('id') || '';
    const illustId = extractIllustId(rawInput);

    if (!illustId) {
      return NextResponse.json(
        { error: 'Invalid Pixiv artwork ID or URL.' },
        { status: 400 }
      );
    }

    const data = await fetchPixivArtwork(illustId);
    return NextResponse.json(data);
  } catch (err: any) {
    if (err instanceof PixivValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PixivNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof PixivRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof PixivAuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof PixivApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status || 502 }
      );
    }

    console.error('Error fetching artwork:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
