import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { User } from 'next-auth'

const prisma = new PrismaClient()

// Custom adapter to handle field mapping
const customPrismaAdapter = (prisma: PrismaClient) => {
  const adapter = PrismaAdapter(prisma)
  
  return {
    ...adapter,
    createUser: async (data: any) => {
      console.log('Creating user with data:', data)
      
      // Map NextAuth fields to our Prisma schema
      const userData = {
        email: data.email,
        name: data.name || null,
        avatar: data.image || null, // Map 'image' to 'avatar'
        emailVerified: data.emailVerified || null,
        isActive: true,
        lastLoginAt: new Date(),
      }
      
      const user = await prisma.user.create({
        data: userData
      })
      
      // Create default user preferences
      try {
        await prisma.userPreference.create({
          data: {
            userId: user.id,
            theme: 'system',
            language: 'en',
            timezone: 'UTC',
            emailNotifications: true,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: 'PRIVATE',
            aiSuggestions: true,
          }
        })
        console.log('User preferences created for user:', user.id)
      } catch (error) {
        console.error('Error creating user preferences:', error)
      }
      
      console.log('User created successfully:', user)
      return user
    },
    
    getUser: async (id: string) => {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          preferences: true,
          organizations: {
            include: {
              organization: true
            }
          }
        }
      })
      return user
    },
    
    getUserByEmail: async (email: string) => {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          preferences: true,
          organizations: {
            include: {
              organization: true
            }
          }
        }
      })
      return user
    },
    
    updateUser: async (data: any) => {
      const { id, ...updateData } = data
      
      // Map image to avatar if present
      if (updateData.image) {
        updateData.avatar = updateData.image
        delete updateData.image
      }
      
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        }
      })
      return user
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: customPrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        }
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          image: user.avatar || undefined,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Persist user ID and other info to token right after signin
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      // Handle account linking and user creation for OAuth
      if (account && profile) {
        console.log('OAuth account linking:', { account, profile })
        token.accessToken = account.access_token
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
    
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile })
      
      if (account?.provider === 'google') {
        try {
          // For Google OAuth, the user should already be created by the adapter
          // We just need to update the last login time
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })
          
          if (existingUser) {
            await prisma.user.update({
              where: { email: user.email! },
              data: { 
                lastLoginAt: new Date(),
                // Update profile info in case it changed
                name: user.name || existingUser.name,
                avatar: user.image || existingUser.avatar,
              }
            })
            console.log('Updated existing user login time and profile')
          } else {
            console.log('New user will be created by adapter')
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          // Still allow sign in even if update fails
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata)
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }