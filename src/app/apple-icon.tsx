import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius   : '40px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="logo.png"
          width={140}
          height={140}
          alt="Kernel"
        />
      </div>
    ),
    { ...size }
  )
}