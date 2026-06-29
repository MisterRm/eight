export interface FeaturedAnime {
  id: number;
  anime_slug: string;
  anime_title: string;
  anime_poster: string;
  order_index: number;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  is_active: boolean;
  download_url?: string;
  created_at: string;
}

export interface AnimeRaw {
  title: string;
  slug: string;
  poster: string;
  episode: string | null;
  type: string | null;
  score: string | null;
  status: string | null;
  release: string | null;
  genres: string[] | null;
  estimation: string | null;
  tooltip_id?: string;
}

export interface GenreItem { name: string; slug: string; }
export interface EpisodeItem { name: string; slug: string; }

export interface DetailPayload {
  title: string;
  poster: string;
  score: string;
  synopsis: string;
  trailer: string | null;
  type: string;
  status: string;
  aired: string;
  duration: string;
  studios: string;
  season: string;
  genres: GenreItem[];
  episodes: EpisodeItem[];
  recommended: AnimeRaw[];
}

export interface MirrorItem { name: string; url: string; }
export interface DownloadLink { server: string; url: string; }
export interface DownloadItem { format: string; resolution: string; links: DownloadLink[]; }

export interface EpisodePayload {
  title: string;
  animeId?: string;
  poster?: string;
  defaultStreamingUrl?: string;
  hasPrev: boolean;
  prevSlug: string | null;
  prevTitle?: string;
  hasNext: boolean;
  nextSlug: string | null;
  nextTitle?: string;
  qualities?: { title: string; serverList: { title: string; serverId: string }[] }[];
  streams?: { name: string; url: string }[];
  // Animekompi (v3)
  mirrors?: MirrorItem[];
  downloads?: DownloadItem[];
}

export type AccentColor = 'white' | 'blue' | 'purple' | 'green' | 'orange';
export type DataSource = 'Dayynime-v1' | 'Dayynime-v2' | 'Dayynime-v3';
export type GridLayout = 'cols-2' | 'cols-3' | 'list';
export type TextSize = 'kecil' | 'sedang' | 'besar';
export type ActiveTab = 'Popular' | 'Movies' | 'Ongoing' | 'Completed' | 'Latest' | 'Genres' | 'All' | 'Donghua' | 'LiveAction' | 'Tokusatsu';

export interface FilterOption { name: string; value: string; }

export interface SuggestItem {
  title: string;
  slug: string;
  image: string;
  type: string;
  status: string;
  genres: string;
}

export interface TooltipData {
  id: string;
  title: string;
  rating: string;
  duration: string;
  quality: string;
  synopsis: string;
  status: string;
  studio: string;
  genres: string[];
  detail_id: string;
}
