'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserType } from '@/types';
import { 
  User, 
  Briefcase, 
  Building2, 
  Camera, 
  Save, 
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface ProfileData {
  name: string;
  profession: string;
  userType: UserType;
  avatar: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    profession: '',
    userType: 'INDIVIDUAL',
    avatar: null
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        
        if (result.success && result.user) {
          setProfileData({
            name: result.user.name || '',
            profession: result.user.profession || '',
            userType: result.user.userType || 'INDIVIDUAL',
            avatar: result.user.avatar || null
          });
          setAvatarPreview(result.user.avatar);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any existing messages when user starts typing
    if (message) setMessage(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
      setProfileData(prev => ({
        ...prev,
        avatar: result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!profileData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          profession: profileData.profession.trim() || null,
          userType: profileData.userType,
          avatar: profileData.avatar
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Optionally refresh the session to get updated data
        // await update();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 pt-20 ">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account preferences
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your profile information and preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-border bg-muted flex items-center justify-center">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {profileData.name ? getUserInitials(profileData.name) : 'U'}
                    </span>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new profile picture
              </p>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-foreground">
                Full Name *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={profileData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="w-full"
                required
              />
            </div>

            {/* Profession Field */}
            <div className="space-y-2">
              <label htmlFor="profession" className="block text-sm font-semibold text-foreground">
                <Briefcase className="w-4 h-4 inline mr-1" />
                Profession
              </label>
              <Input
                id="profession"
                name="profession"
                type="text"
                value={profileData.profession}
                onChange={handleInputChange}
                placeholder="e.g., Software Engineer, Teacher, Student..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Help others understand your role or field of work
              </p>
            </div>

            {/* User Type Field */}
            <div className="space-y-2">
              <label htmlFor="userType" className="block text-sm font-semibold text-foreground">
                Account Type
              </label>
              <div className="relative">
                <select
                  id="userType"
                  name="userType"
                  value={profileData.userType}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                >
                  <option value="INDIVIDUAL">👤 Individual User</option>
                  <option value="ORGANIZATION">🏢 Organization Account</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={profileData.userType === 'INDIVIDUAL' ? 'default' : 'secondary'}>
                  {profileData.userType === 'INDIVIDUAL' ? 'Individual' : 'Organization'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {profileData.userType === 'INDIVIDUAL' 
                    ? 'Personal use with individual document management'
                    : 'Business/team use with collaborative features'
                  }
                </span>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}