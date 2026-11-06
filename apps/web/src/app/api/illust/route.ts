import { NextRequest, NextResponse } from 'next/server';
import { fetchPixivArtwork, extractIllustId } from '@/lib/pixiv';

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
    console.error('Error fetching artwork:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
