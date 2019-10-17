import { MemcachedClient } from '@creditkarma/memcached'

const cache = new MemcachedClient(process.env.REDIS_HOST)

export type User = {
  connectionID: string
  name?: string
  avatar?: string
  rooms: string[]
}

export type Room = {
  id: string
  name?: string
  users: string[]
}

export const getRoom = (room: string): Promise<Room> => {
  return cache.getWithDefault(room, { id: room, users: [] })
}

export const getUser = (user: {
  connectionID: string
  name?: string
  avatar?: string
}) => {
  return cache.getWithDefault(user.connectionID, {
    connectionID: user.connectionID,
    name: user.name,
    avatar: user.avatar,
    rooms: [],
  })
}

export const addUserToRoom = async (
  user: {
    connectionID: string
    name?: string
    avatar?: string
  },
  room: string
) => {
  if (!room) {
    return
  }

  const existingRoom = await getRoom(room)
  const existingUser = await getUser(user)

  existingRoom.users.push(user.connectionID)
  existingUser.rooms.push(room)

  return Promise.all([
    cache.set(room, existingRoom),
    cache.set(user.connectionID, existingUser),
  ])
}

export const removeUser = async (connectionID: string) => {
  const existingUser = await getUser({ connectionID })

  const rooms = await Promise.all(existingUser.rooms.map(r => getRoom(r)))

  return Promise.all(
    rooms.map(r => {
      r.users = r.users.filter(x => x !== connectionID)
      cache.set(r.id, r)
    })
  )
}
