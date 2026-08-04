import { Link } from 'react-router-dom'
import { Keyboard, Zap, Trophy, BarChart3, ChevronRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col gap-24 py-12">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-6 mt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-borderMain text-sm text-textMuted mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <span>New race mode available</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
          Master your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">keystrokes.</span>
        </h1>
        <p className="text-xl text-textMuted max-w-xl mx-auto leading-relaxed">
          Improve your typing speed. Compete with others in real-time races. Become faster with detailed analytics.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
          <Link 
            to="/practice" 
            className="flex items-center gap-2 px-8 py-4 bg-white text-background font-semibold rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto justify-center"
          >
            Start Typing <ChevronRight className="w-5 h-5" />
          </Link>
          <Link 
            to="/race" 
            className="flex items-center gap-2 px-8 py-4 bg-surface border border-borderMain text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center"
          >
            Join Race
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard 
          icon={Keyboard}
          title="Distraction-Free Practice"
          description="A minimal, keyboard-focused interface designed to help you get into the flow state and improve muscle memory."
        />
        <FeatureCard 
          icon={Zap}
          title="Real-time Competitions"
          description="Race against players worldwide. See their progress in real-time and climb the ranks in intense typing battles."
        />
        <FeatureCard 
          icon={BarChart3}
          title="Detailed Analytics"
          description="Track your WPM, accuracy, and error rates over time. Visualize your improvement with beautiful charts."
        />
      </section>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col p-6 rounded-2xl bg-surface border border-borderMain hover:border-primary/50 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-background border border-borderMain flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-textMuted leading-relaxed">{description}</p>
    </div>
  )
}
