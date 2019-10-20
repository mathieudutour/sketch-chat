import WebSocket from 'ws'

const cache: {
  rooms: { [name: string]: Room }
  users: { [id: string]: User }
} = {
  rooms: {},
  users: {},
}

export type User = {
  isAlive: boolean
  connectionID: string
  ws?: WebSocket
  name?: string
  avatar?: string
  rooms: string[]
}

export type Room = {
  id: string
  name?: string
  users: string[]
}

export const getRoom = (room: string): Room => {
  const existingRoom = cache.rooms[room]
  if (existingRoom) {
    return existingRoom
  }
  cache.rooms[room] = {
    id: room,
    users: [],
  }
  return cache.rooms[room]
}

export const getUser = (user: {
  ws?: WebSocket
  connectionID: string
  name?: string
  avatar?: string
}): User => {
  const existingUser = cache.users[user.connectionID]
  if (existingUser) {
    return existingUser
  }
  cache.users[user.connectionID] = {
    isAlive: true,
    connectionID: user.connectionID,
    ws: user.ws,
    name: user.name,
    avatar: user.avatar,
    rooms: [],
  }
  return cache.users[user.connectionID]
}

export const getUserByWs = (ws: WebSocket): User => {
  return Object.values(cache.users).find(x => x.ws === ws)
}

export const userIsAlive = (connectionID: string, alive: boolean = true) => {
  const existingUser = cache.users[connectionID]
  if (!existingUser) {
    return
  }
  cache.users[connectionID] = {
    isAlive: alive,
    ...existingUser,
  }
}

export const addUserToRoom = (user: User, room: string) => {
  if (!room) {
    return
  }

  const existingRoom = getRoom(room)
  const existingUser = getUser(user)

  const users = new Set(existingRoom.users)
  users.add(user.connectionID)
  existingRoom.users = Array.from(users)
  const rooms = new Set(existingUser.rooms)
  rooms.add(room)
  existingUser.rooms = Array.from(rooms)

  cache.rooms[room] = existingRoom
  cache.users[user.connectionID] = existingUser

  return existingRoom
}

export const removeUser = (connectionID: string) => {
  const existingUser = getUser({ connectionID })

  const rooms = existingUser.rooms.map(r => getRoom(r))

  rooms.forEach(r => {
    r.users = r.users.filter(x => x !== connectionID)
    cache.rooms[r.id] = r
  })

  return rooms
}
