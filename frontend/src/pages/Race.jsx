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
  
  // Real Typing State
  const [passage, setPassage] = useState("the secret of getting ahead is getting started")
  const [input, setInput] = useState("")
  const [startTime, setStartTime] = useState(null)
  
  const currentUserId = mockUsers[1].id

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setIsStarted(true)
      setStartTime(Date.now())
    }
  }, [countdown])

  const handleInput = (e) => {
    if (!isStarted) return
    const val = e.target.value
    if (val.length <= passage.length) {
      setInput(val)
    }
  }

  // Calculate my real stats
  let correctChars = 0
  for (let i = 0; i < input.length; i++) {
    if (input[i] === passage[i]) correctChars++
  }
  
  const myProgress = (correctChars / passage.length) * 100
  const elapsedMinutes = startTime ? (Date.now() - startTime) / 60000 : 1/60
  const myWpm = Math.round((correctChars / 5) / (elapsedMinutes || 1/60)) || 0
  const myAcc = input.length > 0 ? Math.round((correctChars / input.length) * 100) : 100

  // Mock opponents progressing
  const [op1Progress, setOp1Progress] = useState(0)
  const [op2Progress, setOp2Progress] = useState(0)

  useEffect(() => {
    if (isStarted) {
      const timer = setInterval(() => {
        setOp1Progress(p => Math.min(p + (Math.random() * 2), 100))
        setOp2Progress(p => Math.min(p + (Math.random() * 1.5), 100))
      }, 500)
      return () => clearInterval(timer)
    }
  }, [isStarted])

  const players = [
    { ...mockUsers[0], progress: isStarted ? op1Progress : 0, wpm: 120 },
    { ...mockUsers[1], progress: isStarted ? myProgress : 0, wpm: myWpm, accuracy: myAcc },
    { ...mockUsers[2], progress: isStarted ? op2Progress : 0, wpm: 90 },
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
        <div className="w-full h-full pb-8 relative group">
           <RaceGame 
              players={players} 
              currentUserId={currentUserId} 
              passage={passage}
              input={input}
              handleInput={handleInput}
           />
        </div>
      )}
    </div>
  )
}
