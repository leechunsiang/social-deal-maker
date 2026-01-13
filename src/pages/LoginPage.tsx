import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: data.identifier,
            password: data.password,
        });

        if (error) {
            alert(error.message);
        } else {
            navigate('/');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An unexpected error occurred');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-violet-600/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full opacity-30 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <Link to="/" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft className="size-4 mr-1" /> Back to Home
        </Link>
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-cyan-400 mb-2">Welcome Back</h1>
            <p className="text-zinc-400">Enter your credentials to access your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email or Username</label>
            <input 
              {...register('identifier')}
              className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="Enter your email or username"
            />
             {errors.identifier && <p className="text-red-400 text-xs mt-1">{errors.identifier.message}</p>}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
             <div className="relative">
                <input 
                {...register('password')}
                type={showPassword ? "text" : "password"}
                className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors pr-10"
                placeholder="••••••••"
                />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
             </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-end">
             <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Forgot Password?</a>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 text-white font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : <><span className="mr-1">Log In</span> <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Don't have an account? <Link to="/signup" className="text-white hover:underline">Sign up</Link>
        </p>


      </motion.div>
    </div>
  );
}
