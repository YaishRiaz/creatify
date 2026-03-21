import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Creatify — Post Content. Get Paid Per View.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{
          color: '#6C47FF',
          fontSize: '24px',
          fontWeight: '900',
          letterSpacing: '-0.5px',
          marginBottom: '40px',
        }}>
          Creatify
        </div>
        <div style={{
          color: 'white',
          fontSize: '72px',
          fontWeight: '900',
          lineHeight: '1',
          letterSpacing: '-3px',
          marginBottom: '24px',
          maxWidth: '800px',
        }}>
          Post Content.{'\n'}Get Paid Per View.
        </div>
        <div style={{
          color: '#71717a',
          fontSize: '24px',
          maxWidth: '600px',
        }}>
          Sri Lanka&apos;s performance UGC platform.
          No follower minimum required.
        </div>
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '80px',
          display: 'flex',
          gap: '32px',
        }}>
          {['TikTok', 'Instagram', 'YouTube', 'Facebook'].map(p => (
            <div key={p} style={{
              color: '#3f3f46',
              fontSize: '16px',
            }}>{p}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
