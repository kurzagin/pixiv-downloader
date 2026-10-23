export interface PageUrl {
  thumbMini?: string;
  small?: string;
  regular?: string;
  original: string;
  width: number;
  height: number;
}

export interface ArtworkTag {
  name: string;
  translation?: string;
}

export interface ArtworkData {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  authorAccount?: string;
  authorAvatar?: string;
  createDate: string;
  uploadDate: string;
  tags: ArtworkTag[];
  illustType: number; // 0: illust, 1: manga, 2: ugoira
  pageCount: number;
  width: number;
  height: number;
  pages: PageUrl[];
  likeCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
}
