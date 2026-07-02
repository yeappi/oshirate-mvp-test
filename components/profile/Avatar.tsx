import Image from 'next/image'
import type { Decoration } from '@/lib/decorationTypes'
import {
  AvatarAroundDecoration,
  AvatarFrameDecoration,
} from '@/components/decoration/DecorationSlotRenderer'

type Props = {
  photoUrl: string | null
  name: string
  // 装飾スロット（なければ何も描画しない）
  avatarAround?: Decoration
  avatarFrame?: Decoration
}

export default function Avatar({ photoUrl, name, avatarAround, avatarFrame }: Props) {
  return (
    <div className="avatar-wrap">
      {/* avatar_around スロット */}
      <AvatarAroundDecoration decoration={avatarAround} />

      <div className="avatar-ring-out" />
      <div className={`avatar-mono ${photoUrl ? 'avatar-photo' : ''}`}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${name} icon`}
            width={112}
            height={112}
            style={{ objectFit: 'cover', objectPosition: 'center 38%', transform: 'scale(1.22)' }}
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
