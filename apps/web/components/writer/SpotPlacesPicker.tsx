'use client';

import { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary, useApiIsLoaded } from '@vis.gl/react-google-maps';

/**
 * Google Places Autocomplete でスポットを検索 → 選択時に Places Details も取得し
 * 営業時間 / 電話 / WEB / 評価まで一気に親へ返す UI。
 *
 * 親（SpotEditor）はこの値をフォームに自動充填する。
 */

export type PickedPlace = {
  /** Place の正式名称 */
  name: string;
  /** 整形済み住所 */
  address: string;
  lat: number;
  lng: number;
  /** Google Place ID（再取得や重複検出のキー） */
  placeId: string;
  /** weekday_text を1つの文字列にまとめたもの（人間可読） */
  openingHoursText: string | null;
  /** Place のカテゴリ（types[]）。Locore のカテゴリへの自動マッピング用 */
  types: string[];
  /** 電話番号（国際表記） */
  phoneNumber: string | null;
  /** 公式サイト URL */
  website: string | null;
  /** Google の星評価（0-5、小数点1桁） */
  rating: number | null;
  /** 評価件数 */
  userRatingsTotal: number | null;
  /** 0 (無料) ～ 4 (とても高価) */
  priceLevel: number | null;
};

type Props = {
  apiKey: string | undefined;
  onPick: (place: PickedPlace) => void;
};

// Google Maps types を window 経由で扱う（tsconfig 簡素化）
type GMaps = typeof window & {
  google: {
    maps: {
      LatLng: new (lat: number, lng: number) => unknown;
      LatLngBounds: new (sw: unknown, ne: unknown) => unknown;
    };
  };
};

function PlacesAutocompleteInner({ onPick }: { onPick: Props['onPick'] }) {
  const isLoaded = useApiIsLoaded();
  const places = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isLoaded || !places || !inputRef.current || !containerRef.current) return;

    const w = window as unknown as GMaps;
    const gmaps = w.google?.maps;

    // Autocomplete はサジェスト → place_id 取得まで。
    // 詳細（opening_hours など）は別途 PlacesService.getDetails で取る。
    const acOptions: Record<string, unknown> = {
      // Autocomplete 段階では place_id だけあれば十分（getDetails で残りを取る）
      fields: ['place_id', 'name'],
    };
    if (gmaps) {
      acOptions.bounds = new gmaps.LatLngBounds(
        new gmaps.LatLng(48.7, 2.2),
        new gmaps.LatLng(48.95, 2.5),
      );
    }

    // PlacesService は地図 or HTMLDivElement にバインドする必要がある
    const placesService = new (places as unknown as {
      PlacesService: new (attr: HTMLDivElement) => {
        getDetails: (
          req: { placeId: string; fields: string[] },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cb: (result: any, status: string) => void,
        ) => void;
      };
    }).PlacesService(containerRef.current);

    const ac = new (places as unknown as {
      Autocomplete: new (
        el: HTMLInputElement,
        opts: Record<string, unknown>,
      ) => {
        getPlace: () => { place_id?: string; name?: string };
        addListener: (ev: string, cb: () => void) => { remove: () => void };
      };
    }).Autocomplete(inputRef.current, acOptions);

    const listener = ac.addListener('place_changed', () => {
      const picked = ac.getPlace();
      if (!picked.place_id) return;

      placesService.getDetails(
        {
          placeId: picked.place_id,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'types',
            'opening_hours',
            'formatted_phone_number',
            'international_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'price_level',
          ],
        },
        (result, status) => {
          if (status !== 'OK' || !result) {
            // フォールバック：autocomplete 取れた最低限だけ流す
            onPick({
              name: picked.name ?? '',
              address: '',
              lat: 0,
              lng: 0,
              placeId: picked.place_id ?? '',
              openingHoursText: null,
              types: [],
              phoneNumber: null,
              website: null,
              rating: null,
              userRatingsTotal: null,
              priceLevel: null,
            });
            return;
          }

          const loc = result.geometry?.location;
          const openingHoursText: string | null = result.opening_hours?.weekday_text
            ? (result.opening_hours.weekday_text as string[]).join('\n')
            : null;

          onPick({
            name: result.name ?? '',
            address: result.formatted_address ?? '',
            lat: loc ? loc.lat() : 0,
            lng: loc ? loc.lng() : 0,
            placeId: result.place_id ?? picked.place_id ?? '',
            openingHoursText,
            types: (result.types as string[] | undefined) ?? [],
            phoneNumber:
              result.formatted_phone_number ??
              result.international_phone_number ??
              null,
            website: result.website ?? null,
            rating: typeof result.rating === 'number' ? result.rating : null,
            userRatingsTotal:
              typeof result.user_ratings_total === 'number'
                ? result.user_ratings_total
                : null,
            priceLevel:
              typeof result.price_level === 'number' ? result.price_level : null,
          });
          setText(result.name ?? '');
        },
      );
    });

    return () => {
      listener.remove();
    };
  }, [isLoaded, places, onPick]);

  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-foreground/70">
        Google で店名を検索
      </label>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例：Pierre Hermé Bonaparte"
        className="flex h-10 w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 text-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-500 focus:px-[11px] focus:outline-none"
      />
      <p className="mt-1 text-[11px] text-foreground/50">
        候補から選ぶと住所・座標・営業時間・電話・WEB・Google 評価をまとめて取得します。
      </p>
      {/* PlacesService の attribution 用ホスト要素（非表示） */}
      <div ref={containerRef} className="hidden" aria-hidden />
    </div>
  );
}

export function SpotPlacesPicker({ apiKey, onPick }: Props) {
  if (!apiKey) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-neutral-50 p-3 text-[12px] text-foreground/60">
        <p className="font-medium text-foreground/70">店名検索は未設定です</p>
        <p className="mt-1">
          下の手動入力欄から店舗名・住所・緯度経度を直接入力してください。
          <br />
          自動補完を有効にするには{' '}
          <code className="rounded-sm bg-neutral-100 px-1 py-0.5 text-[11px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{' '}
          を設定してください。
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <PlacesAutocompleteInner onPick={onPick} />
    </APIProvider>
  );
}
