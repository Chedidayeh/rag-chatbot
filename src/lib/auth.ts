import { cookies } from 'next/headers'
import { prisma } from './prisma'

/**
 * Get or create a user based on session cookie
 * Uses cookie-based sessions without authentication
 * Each new browser session gets a unique user
 */
export async function getOrCreateUser() {
  try {
    const cookieStore = await cookies()
    let sessionId = cookieStore.get('sessionId')?.value

    // Create new session if doesn't exist
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      cookieStore.set('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      })

      console.log(`Created new session: ${sessionId}`)
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { sessionId },
      include: {
        documents: true,
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: { sessionId },
        include: {
          documents: true,
        },
      })

      console.log(`Created new user: ${user.id} with session: ${sessionId}`)
    }

    return user
  } catch (error) {
    console.error('Error in getOrCreateUser:', error)
    throw error
  }
}

/**
 * Get current user from session cookie without creating one
 * Returns null if no session exists
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('sessionId')?.value

    if (!sessionId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { sessionId },
      include: {
        documents: true,
      },
    })

    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

/**
 * Generate user-specific namespace for Pinecone
 * Each user's documents are isolated in their own namespace
 */
export function getUserNamespace(userId: string): string {
  return `user_${userId}`
}
