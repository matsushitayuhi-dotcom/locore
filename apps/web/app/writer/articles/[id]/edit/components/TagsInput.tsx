/**
 * 互換用 re-export。
 * TagsInput は SpotEditor などからも使うため `components/writer/TagsInput.tsx` に
 * 実装を移動した（#1 改修, 2026-05）。既存の import 経路はそのまま動くよう
 * ここから再エクスポートしている。
 */
export { TagsInput } from '@/components/writer/TagsInput';
