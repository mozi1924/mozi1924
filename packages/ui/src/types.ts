export interface Project {
  name: string;
  slug?: string;
  pinned?: boolean;
  pinnedOrder?: number;
  description?: string;
  repoUrl: string;
  homepage?: string;
  stars: number;
  forks: number;
  language?: string;
  topics?: string[];
  license?: string;
  createdAt?: string;
  pushedAt?: string;
  archived?: boolean;
  image?: string;
}
