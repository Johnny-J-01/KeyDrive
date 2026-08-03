import { Link } from 'react-router-dom'
import { Keyboard } from 'lucide-react'

export default function Register() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md bg-surface border border-borderMain p-8 rounded-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-xl mb-4">
            <Keyboard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Create an account</h1>
          <p className="text-textMuted text-sm">Join Keydrive to track your progress</p>
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-textMuted">Username</label>
            <input 
              type="text" 
              className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="SpeedTypist99"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-textMuted">Email</label>
            <input 
              type="email" 
              className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-textMuted">Password</label>
            <input 
              type="password" 
              className="px-4 py-2.5 rounded-lg bg-background border border-borderMain text-white focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors">
            Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-textMuted">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
