import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { mockRaces, mockUsers } from '../data/mock'
import clsx from 'clsx'
import RaceGame from '../components/RaceGame'

export default function Race() {
  const [activeRace, setActiveRace] = useState(null)

  if (activeRace) {
    return <LiveRace raceId={activeRace} onLeave={() => setActiveRace(null)} />
  }

  return (
    <div className="max-w-5xl mx-auto py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Race Lobby</h1>
        <p className="text-textMuted">Join a public race or create your own to compete with friends.</p>
      </div>

      <div className="grid gap-4">
        {mockRaces.map(race => (
          <div key={race.id} className="bg-surface border border-borderMain rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-primary/50 transition-colors">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-lg font-bold text-white">
                <span className="font-mono text-primary">#{race.id.toUpperCase()}</span>
                {race.status === 'waiting' && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">Waiting for players</span>}
                {race.status === 'starting_soon' && <span className="px-2 py-0.5 text-xs rounded-full bg-warning/20 text-warning">Starting soon</span>}
                {race.status === 'running' && <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">In Progress</span>}
              </div>
              <div className="flex items-center gap-2 text-textMuted text-sm">
                <Users className="w-4 h-4" />
                {race.players} / {race.capacity} players joined
              </div>
            </div>

            <button 
              onClick={() => setActiveRace(race.id)}
              disabled={race.status === 'running' || race.players >= race.capacity}
              className="px-6 py-3 font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {race.status === 'running' ? 'Race in progress' : 'Join Race'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveRace({ raceId, onLeave }) {
  const [countdown, setCountdown] = useState(5)
  const [isStarted, setIsStarted] = useState(false)
  const [progress, setProgress] = useState(0)
  const currentUserId = mockUsers[1].id

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setIsStarted(true)
    }
  }, [countdown])

  // Mock progress increment for the user
  useEffect(() => {
    if (isStarted && progress < 100) {
      const timer = setTimeout(() => setProgress(p => Math.min(p + Math.random() * 5, 100)), 500)
      return () => clearTimeout(timer)
    }
  }, [isStarted, progress])

  const players = [
    { ...mockUsers[0], progress: isStarted ? Math.min(progress + 15, 100) : 0, wpm: 120 },
    { ...mockUsers[1], progress: isStarted ? progress : 0, wpm: 105 }, // Current user
    { ...mockUsers[2], progress: isStarted ? Math.max(progress - 10, 0) : 0, wpm: 90 },
  ]

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between px-6">
        <h2 className="text-2xl font-bold text-white font-mono">Race #{raceId.toUpperCase()}</h2>
        <button onClick={onLeave} className="text-textMuted hover:text-white transition-colors text-sm font-medium">Leave Race</button>
      </div>

      {!isStarted && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border border-borderMain rounded-2xl mx-6">
          <span className="text-xl text-textMuted mb-4">Race starts in</span>
          <span className="text-7xl font-bold font-mono text-primary animate-pulse">{countdown}</span>
        </div>
      )}

      {isStarted && (
        <div className="w-full h-full pb-8">
           <RaceGame players={players} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  )
}
