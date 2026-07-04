'use client'

import { useState, useEffect } from 'react'
import type { Decoration } from '@/lib/decorationTypes'
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
}

export default function Avatar({ photoUrl, name, avatarAround, avatarFrame, cssFrameKey }: Props) {
  const [imgError, setImgError] = useState(false)

  // photoUrl が変わったらエラー状態をリセット
  useEffect(() => {
    setImgError(false)
  }, [photoUrl])

  // photoUrl があり読み込み成功している場合だけ画像表示
  const showImg = photoUrl && !imgError

  return (
    <div className="avatar-wrap" data-avatar-frame={cssFrameKey ?? 'black'}>
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

      <span className="avatar-tick n" />
      <span className="avatar-tick s" />
      <span className="avatar-tick e" />
      <span className="avatar-tick w" />
      <div className="avatar-dot" />
    </div>
  )
}
