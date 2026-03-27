import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width          : '100%',
          height         : '100%',
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          background     : '#0a0a0a',
          borderRadius   : '6px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="logo.png"
          width={28}
          height={28}
          alt="Kernel"
        />
      </div>
    ),
    { ...size }
  )
}