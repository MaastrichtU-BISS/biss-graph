import type { Graph } from "../types/graph";

export declare const SITE: string;

export declare function slugOf(url: string): string;

export type WebsitePerson = { slug: string; name: string; role?: string; photo?: string };

export declare function profilePhoto(person: WebsitePerson): Promise<string | undefined>;

export declare function fetchWebsiteGraph(options?: {
  previous?: Graph;
  excludePeople?: string[];
  excludeProjects?: string[];
  hasLocalPhoto?: (slug: string) => boolean;
  photoUrls?: boolean;
}): Promise<{ graph: Graph; team: WebsitePerson[]; skipped: WebsitePerson[] }>;
