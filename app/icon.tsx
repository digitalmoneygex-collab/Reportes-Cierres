import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          borderRadius: '22%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '5%',
            right: '5%',
            bottom: '5%',
            borderRadius: '18%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        />
        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.05em',
            background: 'linear-gradient(to bottom right, #38bdf8, #818cf8)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
          }}
        >
          GEX
        </div>
      </div>
    ),
    { ...size }
  );
}
