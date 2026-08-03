import { Activity, Clock, Trophy, Target, Star, Flame } from 'lucide-react'
import { mockUsers } from '../data/mock'

export default function Profile() {
  const user = mockUsers[0] // Using first user as mock self

  return (
    <div className="max-w-5xl mx-auto py-8 flex flex-col gap-8">
      {/* User Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-surface border border-borderMain rounded-2xl">
        <img src={user.avatar} alt="avatar" className="w-24 h-24 rounded-full bg-borderMain p-1" />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white mb-2">{user.username}</h1>
          <p className="text-textMuted flex items-center justify-center md:justify-start gap-2">
            <Clock className="w-4 h-4" /> Joined August 2026
          </p>
        </div>
        <button className="px-6 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-medium rounded-lg">
          Edit Profile
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Average WPM" value={user.wpm} />
        <StatCard icon={Target} label="Accuracy" value={`${user.accuracy}%`} />
        <StatCard icon={Trophy} label="Races Won" value={user.racesWon} />
        <StatCard icon={Flame} label="Current Streak" value="12 Days" />
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-4">
        {/* Achievements Placeholder */}
        <div className="bg-surface border border-borderMain rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Star className="text-primary w-5 h-5" /> Achievements
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-borderMain">
              <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white">Speed Demon</h4>
                <p className="text-sm text-textMuted">Reach 140 WPM in a race</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-borderMain">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white">Accuracy Master</h4>
                <p className="text-sm text-textMuted">Finish 10 races with 100% accuracy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Placeholder */}
        <div className="bg-surface border border-borderMain rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Activity className="w-12 h-12 text-borderMain mb-4" />
          <h3 className="text-xl font-bold text-textMuted mb-2">Performance History</h3>
          <p className="text-sm text-textMuted/50 text-center max-w-xs">Interactive charts will be rendered here using Recharts or Chart.js</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface border border-borderMain p-6 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center gap-2 text-textMuted text-sm font-medium">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-3xl font-bold font-mono text-white">
        {value}
      </div>
    </div>
  )
}
