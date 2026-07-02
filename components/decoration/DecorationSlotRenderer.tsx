import type { Decoration } from '@/lib/decorationTypes'

// ============================================================
// 汎用：1つのスロットに装飾を描画する
// asset_url が null のとき → 何も描画しない（透明）
// asset_url がある → img タグで表示
// ============================================================

type SlotRendererProps = {
  decoration?: Decoration
  style?: React.CSSProperties
  className?: string
}

export function DecorationLayer({ decoration, style, className }: SlotRendererProps) {
  if (!decoration?.asset_url) return null

  // SVGはそのまま img で表示（将来的にインライン SVG も可）
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={decoration.asset_url}
      alt={decoration.name}
      aria-hidden="true"
      className={className}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
    />
  )
}

// ============================================================
// profile_background スロット
// card の直下に absolute で敷くレイヤー
// ============================================================
export function ProfileBackgroundDecoration({ decoration }: { decoration?: Decoration }) {
  if (!decoration?.asset_url) return null

  return (
    <DecorationLayer
      decoration={decoration}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: 2,
        zIndex: 0,
        opacity: 0.18,  // 控えめに。素材が完成したら調整
      }}
    />
  )
}

// ============================================================
// avatar_around スロット
// Avatar の wrapper 上に absolute で重ねる
// ============================================================
export function AvatarAroundDecoration({ decoration }: { decoration?: Decoration }) {
  if (!decoration?.asset_url) return null

  return (
    <DecorationLayer
      decoration={decoration}
      style={{
        position: 'absolute',
        inset: -8,
        width: 'calc(100% + 16px)',
        height: 'calc(100% + 16px)',
        zIndex: 2,
      }}
    />
  )
}

// ============================================================
// avatar_frame スロット
// avatar-ring の上に重ねるフレーム
// ============================================================
export function AvatarFrameDecoration({ decoration }: { decoration?: Decoration }) {
  if (!decoration?.asset_url) return null

  return (
    <DecorationLayer
      decoration={decoration}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 3,
      }}
    />
  )
}

// ============================================================
// above_name スロット
// rank-plain の上に差し込む
// ============================================================
export function AboveNameDecoration({ decoration }: { decoration?: Decoration }) {
  if (!decoration?.asset_url) return null

  return (
    <DecorationLayer
      decoration={decoration}
      style={{
        display: 'block',
        margin: '8px auto 0',
        height: 20,
        width: 'auto',
      }}
    />
  )
}

// ============================================================
// comment_decoration スロット
// profile-comment セクションの背後に敷く
// ============================================================
export function CommentDecoration({ decoration }: { decoration?: Decoration }) {
  if (!decoration?.asset_url) return null

  return (
    <DecorationLayer
      decoration={decoration}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        zIndex: 0,
        opacity: 0.12,
      }}
    />
  )
}
