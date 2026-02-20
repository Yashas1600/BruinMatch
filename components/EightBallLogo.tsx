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
      <div 
        className="absolute inset-0 rounded-full bg-primary-500"
        style={{ width: size, height: size }}
      />
      
      <div 
        className="absolute rounded-full bg-white"
        style={{ 
          width: size * 0.55, 
          height: size * 0.55,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      <div 
        className="absolute text-primary-500 font-black flex items-center justify-center"
        style={{ 
          width: size * 0.5, 
          height: size * 0.5,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.3
        }}
      >
        8
      </div>
    </div>
  )
}
