export type CommentProvider = "artalk" | "giscus";

export interface ArtalkCommentConfig {
  server: string;
  visitorCount: boolean;
}

export interface GiscusCommentConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: "pathname" | "url" | "title" | "og:title" | "specific" | "number";
  strict: boolean;
  reactionsEnabled: boolean;
  inputPosition: "top" | "bottom";
  lang: string;
}

export interface CommentConfig {
  enabled: boolean;
  type: CommentProvider;
  artalk: ArtalkCommentConfig;
  giscus: GiscusCommentConfig;
}
