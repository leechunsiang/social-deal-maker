import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const signUpSchema = z.object({
  accessKey: z.string().min(1, 'Access key is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the privacy policy',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      acceptTerms: false,
    }
  });

  const password = watch('password');

  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            username: data.username,
            access_key: data.accessKey,
          },
        },
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert('Account created successfully!');
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      alert('An unexpected error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 6) score++;
    if (pass.length > 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(password);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-violet-600/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full opacity-30 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <Link to="/" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft className="size-4 mr-1" /> Back to Home
        </Link>
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-cyan-400 mb-2">Create Account</h1>
            <p className="text-zinc-400">Join thousands of creators regarding control.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Access Key</label>
            <div className="relative">
                <input 
                  {...register('accessKey')}
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors pl-10"
                  placeholder="Enter your access key"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Key size={18} />
                </div>
            </div>
             {errors.accessKey && <p className="text-red-400 text-xs mt-1">{errors.accessKey.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">First Name</label>
              <input 
                {...register('firstName')}
                className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="John"
              />
              {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Last Name</label>
              <input 
                {...register('lastName')}
                className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Doe"
              />
               {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
            <input 
              {...register('username')}
              className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="johndoe"
            />
             {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input 
              {...register('email')}
              type="email"
              className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="john@example.com"
            />
             {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
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
            
            {/* Password Strength Meter */}
            {password && (
                <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={cn("h-full w-full rounded-full transition-colors", strength >= i ? (i <= 2 ? "bg-red-500" : i <= 3 ? "bg-yellow-500" : "bg-emerald-500") : "bg-zinc-800")} />
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 text-right">{strength <= 2 ? 'Weak' : strength <= 3 ? 'Medium' : 'Strong'}</p>
                </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Confirm Password</label>
            <div className="relative">
                <input 
                {...register('confirmPassword')}
                type={showConfirmPassword ? "text" : "password"}
                className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors pr-10"
                placeholder="••••••••"
                />
                 <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
             {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <div className="flex items-start gap-3 pt-2">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                {...register('acceptTerms')}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-900"
              />
            </div>
            <label htmlFor="terms" className="text-sm text-zinc-400 leading-tight">
              I agree to the <Link to="/privacy-policy" className="text-violet-400 hover:text-violet-300 hover:underline">Privacy Policy</Link> and Terms of Service.
            </label>
          </div>
          {errors.acceptTerms && <p className="text-red-400 text-xs">{errors.acceptTerms.message}</p>}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-linear-to-r from-violet-600 to-cyan-500 text-white font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : <><span className="mr-1">Create Account</span> <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Already have an account? <Link to="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
