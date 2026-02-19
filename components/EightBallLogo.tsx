'use client'

interface EightBallLogoProps {
  size?: number
  className?: string
}

export default function EightBallLogo({ size = 40, className = '' }: EightBallLogoProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer white circle */}
      <div 
        className="absolute inset-0 rounded-full bg-white"
        style={{ width: size, height: size }}
      />
      
      {/* Inner circle with background color (solid pink) */}
      <div 
        className="absolute rounded-full bg-pink-500"
        style={{ 
          width: size * 0.7, 
          height: size * 0.7,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      {/* Number 8 */}
      <div 
        className="absolute text-white font-bold flex items-center justify-center"
        style={{ 
          width: size * 0.5, 
          height: size * 0.5,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.35
        }}
      >
        8
      </div>
    </div>
  )
}

