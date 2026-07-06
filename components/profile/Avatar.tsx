'use client'

import { useState, useEffect } from 'react'
import type { Decoration } from '@/lib/decorationTypes'
import type { AvatarDecorationAsset } from '@/lib/avatarDecorations'
import {
  AvatarAroundDecoration,
  AvatarFrameDecoration,
} from '@/components/decoration/DecorationSlotRenderer'

type Props = {
  photoUrl: string | null
  name: string
  avatarAround?: Decoration
  avatarFrame?: Decoration
  cssFrameKey?: string | null
  avatarEffectKey?: string | null
  wingAsset?: AvatarDecorationAsset | null
  crownAsset?: AvatarDecorationAsset | null
  frontFxAsset?: AvatarDecorationAsset | null
}

function AvatarAssetLayer({ asset, slot }: { asset?: AvatarDecorationAsset | null; slot: 'back' | 'crown' | 'front' }) {
  if (!asset) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      alt=""
      aria-hidden="true"
      className={`avatar-asset-layer avatar-asset-${slot} ${asset.className}`}
      draggable={false}
    />
  )
}

export default function Avatar({
  photoUrl,
  name,
  avatarAround,
  avatarFrame,
  cssFrameKey,
  avatarEffectKey,
  wingAsset,
  crownAsset,
  frontFxAsset,
}: Props) {
  const [imgError, setImgError] = useState(false)

  // photoUrl が変わったらエラー状態をリセット
  useEffect(() => {
    setImgError(false)
  }, [photoUrl])

  // photoUrl があり読み込み成功している場合だけ画像表示
  const showImg = photoUrl && !imgError

  return (
    <div className="avatar-wrap" data-avatar-frame={cssFrameKey ?? 'black'} data-avatar-effect={avatarEffectKey ?? 'none'}>
      <AvatarAssetLayer asset={wingAsset} slot="back" />

      <div className="avatar-effect-base" />
      <div className="avatar-effect-flame" />

      {/* avatar_around スロット */}
      <AvatarAroundDecoration decoration={avatarAround} />

      <div className="avatar-ring-out" />
      <div className={`avatar-mono ${showImg ? 'avatar-photo' : ''}`}>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photoUrl}
            src={photoUrl}
            alt={`${name} icon`}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'cover',
              objectPosition: 'center 38%',
              transform: 'scale(1.22)',
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          name.charAt(0)
        )}
      </div>
      <div className="avatar-ring-in" />

      {/* avatar_frame スロット */}
      <AvatarFrameDecoration decoration={avatarFrame} />
      <AvatarAssetLayer asset={crownAsset} slot="crown" />
      <AvatarAssetLayer asset={frontFxAsset} slot="front" />

      <span className="avatar-tick n" />
      <span className="avatar-tick s" />
      <span className="avatar-tick e" />
      <span className="avatar-tick w" />
      <div className="avatar-dot" />
    </div>
  )
}
