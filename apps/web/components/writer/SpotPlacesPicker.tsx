'use client';

import { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary, useApiIsLoaded } from '@vis.gl/react-google-maps';

// Google Maps types を window 経由で扱う（tsconfig の types に google.maps を明示しない方針）
type GMaps = typeof window & {
  google: {
    maps: {
      LatLng: new (lat: number, lng: number) => unknown;
      LatLngBounds: new (sw: unknown, ne: unknown) => unknown;
    };
  };
};

/**
 * Google Places Autocomplete を使ったスポット検索 UI。
 *
 * - 親から `apiKey` が無い場合はフォールバック（手動入力 UI に切り替え）
 * - 候補から選択した場合 `onPick({ name, address, lat, lng, placeId })` を呼ぶ
 */

export type PickedPlace = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
};

type Props = {
  /** Google Maps API キー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY） */
  apiKey: string | undefined;
  onPick: (place: PickedPlace) => void;
};

function PlacesAutocompleteInner({ onPick }: { onPick: Props['onPick'] }) {
  const isLoaded = useApiIsLoaded();
  const places = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isLoaded || !places || !inputRef.current) return;
    const w = window as unknown as GMaps;
    const gmaps = w.google?.maps;
    // 旧 API：Autocomplete（PlaceAutocompleteElement は新仕様だが互換のため Autocomplete を採用）
    const acOptions: Record<string, unknown> = {
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    };
    if (gmaps) {
      // 任意：パリ周辺バイアス（PRD 既定都市）
      acOptions.bounds = new gmaps.LatLngBounds(
        new gmaps.LatLng(48.7, 2.2),
        new gmaps.LatLng(48.95, 2.5),
      );
    }
    const ac = new (places as unknown as {
      Autocomplete: new (el: HTMLInputElement, opts: Record<string, unknown>) => {
        getPlace: () => {
          name?: string;
          formatted_address?: string;
          place_id?: string;
          geometry?: { location?: { lat: () => number; lng: () => number } };
        };
        addListener: (ev: string, cb: () => void) => { remove: () => void };
      };
    }).Autocomplete(inputRef.current, acOptions);
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place || !place.geometry || !place.geometry.location) {
        return;
      }
      onPick({
        name: place.name ?? '',
        address: place.formatted_address ?? '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id ?? '',
      });
      setText(place.name ?? '');
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
        className="flex h-10 w-full rounded-sm border border-neutral-200 bg-neutral-0 px-3 text-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-2 focus:border-primary-700 focus:px-[11px] focus:outline-none"
      />
      <p className="mt-1 text-[11px] text-foreground/50">
        候補から選ぶと住所・緯度経度・place_id を自動で記入します。
      </p>
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
