import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function MessageCountVisualization() {
  const [channelCount, setChannelCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChannelCount = async () => {
      try {
        setLoading(true)
        const channelsSnap = await getDocs(collection(db, 'channels'))
        setChannelCount(channelsSnap.size)
      } catch (e) {
        console.error('Failed to fetch channel count', e)
        setChannelCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchChannelCount()
    const interval = setInterval(fetchChannelCount, 10000)
    return () => clearInterval(interval)
  }, [])

  // Scale based on channel count
  const waves = Math.min(Math.floor(channelCount / 2) + 3, 8)

  // Generate smooth wave paths
  const generateWavePath = (waveIndex) => {
    const points = []
    const steps = 80
    const amplitude = 20 + waveIndex * 8
    const frequency = 0.5 + waveIndex * 0.3
    const yOffset = 50 + waveIndex * 30

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 300
      const y = yOffset + Math.sin((i / steps) * Math.PI * 2 * frequency) * amplitude
      points.push(`${x},${y}`)
    }
    return `M${points.join(' L')}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg
        width="300"
        height="400"
        viewBox="0 0 300 400"
        style={{
          backgroundColor: 'rgba(15, 23, 32, 0.5)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Animated flowing waves */}
        {Array.from({ length: waves }).map((_, i) => (
          <path
            key={`wave-${i}`}
            d={generateWavePath(i)}
            fill="none"
            stroke={`rgba(255, 255, 255, ${0.7 - i * 0.08})`}
            strokeWidth={2 - i * 0.15}
            filter="url(#glow)"
            style={{
              animation: `drawWave ${8 + i * 1.5}s ease-in-out infinite`,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          />
        ))}

        {/* Central vertical line */}
        <line
          x1="150"
          y1="0"
          x2="150"
          y2="400"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
          style={{
            animation: `pulse 3s ease-in-out infinite`,
          }}
        />

        {/* Rotating geometric spirals */}
        {Array.from({ length: Math.min(waves - 2, 3) }).map((_, layer) => {
          const radius = 40 + layer * 30
          const points = 12 + layer * 4
          const pathPoints = Array.from({ length: points }).map((_, i) => {
            const angle = (i / points) * Math.PI * 2
            const x = 150 + Math.cos(angle) * radius
            const y = 200 + Math.sin(angle) * radius
            return `${x},${y}`
          })
          pathPoints.push(pathPoints[0])

          return (
            <path
              key={`spiral-${layer}`}
              d={`M${pathPoints.join(' L')}`}
              fill="none"
              stroke={`rgba(255, 255, 255, ${0.5 - layer * 0.1})`}
              strokeWidth={1.5 - layer * 0.2}
              filter="url(#glow)"
              style={{
                animation: `rotateSpiral ${12 - layer * 2}s linear infinite`,
                transformOrigin: '150px 200px',
              }}
            />
          )
        })}

        {/* Orbiting particles */}
        {Array.from({ length: channelCount }).map((_, i) => {
          return (
            <circle
              key={`orbit-${i}`}
              cx="150"
              cy="200"
              r="2"
              fill="rgba(255, 255, 255, 0.8)"
              filter="url(#glow)"
              style={{
                animation: `traceOrbit ${8 + i * 1.5}s linear infinite`,
                transformOrigin: '150px 200px',
              }}
            />
          )
        })}
      </svg>

      {/* Channel count display */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.9)' }}>
          {loading ? '...' : channelCount}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 6 }}>
          {loading ? 'Loading channels' : `${channelCount === 1 ? 'channel' : 'channels'} available`}
        </div>
      </div>

      <style>{`
        @keyframes drawWave {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        @keyframes rotateSpiral {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes traceOrbit {
          0% { transform: rotate(0deg) translateX(60px); }
          100% { transform: rotate(360deg) translateX(60px); }
        }
      `}</style>
    </div>
  )
}
