import 'server-only';
import { getRegionBySlug } from '@/lib/geo/countries';

/**
 * 都市フィルタの解決結果。
 * region パラメータが空 or 該当 region 無しなら active=false。
 *
 * cities テーブルの id を resolveCommunityRegion で解決して
 * listCommunityPosts({ cityId }) に渡す想定。
 */
export type CommunityRegionFilter =
  | {
      active: false;
      cityId: undefined;
      slug: undefined;
      nameJa: undefined;
    }
  | {
      active: true;
      cityId: string;
      slug: string;
      nameJa: string;
    };

const INACTIVE: CommunityRegionFilter = {
  active: false,
  cityId: undefined,
  slug: undefined,
  nameJa: undefined,
};

/**
 * URL クエリの ?region=<slug> から CommunityRegionFilter を解決する。
 *
 * - slug が空文字 / undefined / null のときは INACTIVE
 * - DB に該当 region が無いときも INACTIVE（エラーにしない）
 */
export async function resolveCommunityRegion(
  regionSlug: string | undefined | null,
): Promise<CommunityRegionFilter> {
  const slug = (regionSlug ?? '').trim();
  if (!slug) return INACTIVE;
  const region = await getRegionBySlug(slug);
  if (!region) return INACTIVE;
  return {
    active: true,
    cityId: region.id,
    slug: region.slug,
    nameJa: region.nameJa,
  };
}
