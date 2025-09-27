'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { UserType } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'INDIVIDUAL' as UserType,
    profession: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
          profession: formData.profession || undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Don't set cookie here, redirect to login page instead
        router.push('/login?message=Registration successful! Please sign in with your credentials.');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-8 left-5 z-20">
        <Link 
          href="/" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to homepage</span>
        </Link>
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-md w-full space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Documents Organizer
              </h1>
              <p className="text-xs text-muted-foreground">Intelligent Document Management</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Create your account
            </h2>
            <p className="text-muted-foreground">
              Join our secure document management platform
            </p>
          </div>
        </div>

        <Card className="p-8 shadow-2xl border-0 bg-card/80 backdrop-blur-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V7H21M21,16V10H3V16H21M21,17H3V21C3,22.11 3.89,23 5,23H19C20.11,23 21,22.11 21,21V17Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="userType" className="block text-sm font-semibold text-foreground mb-2">
                  Account Type
                </label>
                <div className="relative">
                  <select
                    id="userType"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    className="w-full h-12 px-3 bg-background/50 border border-border/50 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-background transition-all duration-200 text-foreground appearance-none cursor-pointer"
                    disabled={loading}
                  >
                    <option value="INDIVIDUAL">👤 Individual User</option>
                    <option value="ORGANIZATION">🏢 Organization Account</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="profession" className="block text-sm font-semibold text-foreground mb-2">
                  Profession <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Input
                  id="profession"
                  name="profession"
                  type="text"
                  value={formData.profession}
                  onChange={handleChange}
                  placeholder="e.g., Student, Teacher, Engineer, Manager"
                  className="w-full h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password (min. 6 characters)"
                  className="w-full h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Create account</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-border/20">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="font-semibold text-primary hover:text-primary/80 transition-colors duration-200 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </Card> 
      </div>
    </div>
  );
}