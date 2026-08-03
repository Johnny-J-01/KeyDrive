import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Users, Activity } from 'lucide-react'
import clsx from 'clsx'

// CSS based top-down car component
function TopDownCar({ color = 'blue', isMe = false, username = '' }) {
  const baseColorClass = color === 'blue' ? 'bg-blue-600' : 'bg-red-600'
  const lightColorClass = color === 'blue' ? 'bg-blue-400' : 'bg-red-400'
  
  return (
    <div className="relative flex flex-col items-center">
      {/* Name tag */}
      <div className={clsx("absolute -top-8 px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-md z-20", isMe ? 'bg-primary text-white' : 'bg-surface border border-borderMain text-white')}>
        {isMe ? 'You' : username}
      </div>
      
      {/* Car Body */}
      <div className={clsx("w-12 h-24 rounded-lg shadow-xl relative z-10 border-2 border-black/20", baseColorClass)}>
        {/* Roof/Windshield */}
        <div className="absolute top-4 left-1 right-1 h-10 bg-gray-900 rounded-md border border-gray-700 opacity-90"></div>
        {/* Back window */}
        <div className="absolute bottom-3 left-1 right-1 h-4 bg-gray-900 rounded opacity-90"></div>
        {/* Headlights */}
        <div className="absolute -top-1 left-1 w-2 h-2 bg-yellow-100 rounded-full shadow-[0_0_10px_rgba(255,255,200,0.8)]"></div>
        <div className="absolute -top-1 right-1 w-2 h-2 bg-yellow-100 rounded-full shadow-[0_0_10px_rgba(255,255,200,0.8)]"></div>
        {/* Taillights */}
        <div className="absolute -bottom-0.5 left-1 w-2 h-1 bg-red-400 rounded shadow-[0_0_8px_rgba(255,100,100,0.8)]"></div>
        <div className="absolute -bottom-0.5 right-1 w-2 h-1 bg-red-400 rounded shadow-[0_0_8px_rgba(255,100,100,0.8)]"></div>
        
        {/* Speed lines/Exhaust (only active when moving, simplified here) */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1 z-0">
           <div className={clsx("w-1 h-12 opacity-50 blur-[2px] animate-pulse rounded-full", lightColorClass)} style={{ animationDuration: '0.2s' }}></div>
           <div className={clsx("w-1 h-16 opacity-70 blur-[2px] animate-pulse rounded-full", lightColorClass)} style={{ animationDuration: '0.15s' }}></div>
           <div className={clsx("w-1 h-12 opacity-50 blur-[2px] animate-pulse rounded-full", lightColorClass)} style={{ animationDuration: '0.25s' }}></div>
        </div>
      </div>
    </div>
  )
}

export default function RaceGame({ players, currentUserId }) {
  const [roadOffset, setRoadOffset] = useState(0)
  const requestRef = useRef()
  
  // Find current player
  const me = players.find(p => p.id === currentUserId) || players[0]
  
  // Animation loop for the scrolling road
  const animate = time => {
    // Scroll road based on 'my' progress. 
    // In a real app, this would be derived from actual WPM / elapsed time.
    const speed = me.progress > 0 && me.progress < 100 ? (me.wpm / 10) : 2 // Default slow speed or based on typing
    
    setRoadOffset(prev => (prev + speed) % 1000)
    requestRef.current = requestAnimationFrame(animate)
  }
  
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current)
  }, [me.progress])

  return (
    <div className="relative w-full h-[600px] bg-green-900 rounded-2xl overflow-hidden shadow-2xl border border-borderMain select-none">
      
      {/* The Scrolling Road */}
      <div 
        className="absolute inset-0 left-1/2 -translate-x-1/2 w-[60%] md:w-[40%] bg-gray-800"
        style={{
          backgroundImage: 'linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.4) 50%)',
          backgroundSize: '20px 100px',
          backgroundPosition: `center ${roadOffset}px`,
          borderLeft: '4px solid #fff',
          borderRight: '4px solid #fff'
        }}
      />
      
      {/* Side grass/trees (Static for simplicity, road moves) */}
      <div className="absolute top-0 bottom-0 left-0 w-[20%] md:w-[30%] opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #166534 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-0 bottom-0 right-0 w-[20%] md:w-[30%] opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #166534 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

      {/* Cars Container - Relative positioning based on 'me' */}
      <div className="absolute inset-0 flex items-end justify-center pb-32">
        {players.map((player, idx) => {
          const isMe = player.id === currentUserId
          // Calculate relative position to 'me'
          // If player is 10% ahead, they are higher up on the screen.
          const relativeProgress = player.progress - me.progress
          const translateY = -relativeProgress * 10 // Multiply to scale visually
          
          // Spread cars horizontally
          const numLanes = players.length
          const laneWidth = 80
          const totalWidth = numLanes * laneWidth
          const startX = -totalWidth / 2 + laneWidth / 2
          const translateX = startX + (idx * laneWidth)

          return (
            <div 
              key={player.id}
              className="absolute transition-transform duration-500 ease-out"
              style={{
                transform: `translate(${translateX}px, ${translateY}px)`,
                zIndex: isMe ? 50 : 10
              }}
            >
              <TopDownCar color={isMe ? 'blue' : 'red'} isMe={isMe} username={player.username} />
            </div>
          )
        })}
      </div>

      {/* HUD: Left - Player List */}
      <div className="absolute top-6 left-6 bg-surface/90 backdrop-blur-md border border-borderMain p-4 rounded-xl shadow-lg w-48">
        <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4">Players</h3>
        <div className="flex flex-col gap-3">
          {/* Sorted by progress */}
          {[...players].sort((a, b) => b.progress - a.progress).map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                 <span className={clsx("font-bold", idx === 0 ? 'text-yellow-500' : 'text-textMuted')}>{idx + 1}</span>
                 <span className={clsx("font-medium", p.id === currentUserId ? 'text-primary' : 'text-white')}>{p.id === currentUserId ? 'You' : p.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HUD: Right - Stats */}
      <div className="absolute top-6 right-6 flex flex-col gap-4">
        <div className="bg-surface/90 backdrop-blur-md border border-borderMain p-4 rounded-xl shadow-lg flex flex-col items-center justify-center w-24">
          <span className="text-xs font-bold text-textMuted uppercase">WPM</span>
          <span className="text-3xl font-bold font-mono text-white">{me.wpm || 0}</span>
        </div>
        <div className="bg-surface/90 backdrop-blur-md border border-borderMain p-4 rounded-xl shadow-lg flex flex-col items-center justify-center w-24">
          <span className="text-xs font-bold text-textMuted uppercase">ACC</span>
          <span className="text-2xl font-bold font-mono text-white">{me.accuracy || 100}%</span>
        </div>
      </div>

      {/* HUD: Bottom Center - Typing Area (Mocked for Race Component) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-surface/95 backdrop-blur-xl border border-borderMain p-6 rounded-2xl shadow-2xl">
        <div className="text-xl font-mono text-textMuted leading-relaxed mb-4">
          <span className="text-success">believe you can and you </span>
          <span className="text-white border-b-2 border-primary">are</span> halfway there
        </div>
        <div className="flex items-center justify-between mt-4 border-t border-borderMain/50 pt-4">
           <div className="flex items-center gap-2">
             <Activity className="w-4 h-4 text-primary" />
             <span className="text-sm font-bold text-textMuted">STREAK x15</span>
           </div>
           <div className="flex gap-1">
             {[...Array(8)].map((_, i) => (
               <div key={i} className="h-2 w-6 bg-success rounded-sm skew-x-[-20deg]"></div>
             ))}
           </div>
        </div>
      </div>
      
    </div>
  )
}
