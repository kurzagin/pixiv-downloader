export interface PixivPage {
  urls: {
    thumb_mini: string;
    small: string;
    regular: string;
    original: string;
  };
  width: number;
  height: number;
}

export interface ArtworkData {
  id: string;
  title: string;
  description: string;
  illustType: number;
  createDate: string;
  uploadDate: string;
  pageCount: number;
  width: number;
  height: number;
  userName: string;
  userId: string;
  userAccount: string;
  tags: {
    tag: string;
    translation?: {
      en?: string;
    };
  }[];
  likeCount: number;
  bookmarkCount: number;
  viewCount: number;
  urls: {
    mini: string;
    thumb: string;
    small: string;
    regular: string;
    original: string;
  };
  pages: PixivPage[];
}
