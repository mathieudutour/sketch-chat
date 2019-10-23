import { Server } from 'ws'
import querystring from 'querystring'
import express from 'express'
import randomString from 'randomstring'
import {
  removeUser,
  getUser,
  getRoom,
  addUserToRoom,
  userIsAlive,
  getUserByWs,
  removeUserFromRoom,
} from './storage'
import { sendMessage } from './sent-message'

const PORT = process.env.PORT || 3000

const server = express()
  .use((_req, res) => res.send(`Sketch Chat`))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

var wss = new Server({ server: server })
console.log('websocket server created')

wss.on('connection', async (ws, req) => {
  const connectionID = randomString.generate()
  const { name, avatar } = querystring.parse(req.url.replace(/^\/\?/, ''))

  if (Array.isArray(name) || Array.isArray(avatar)) {
    return
  }

  getUser({ connectionID, ws, name, avatar })

  console.log('websocket connection open')

  ws.on('pong', () => userIsAlive(connectionID))

  ws.on('message', data => {
    const user = getUser({ connectionID })
    const body = JSON.parse(String(data) || '{}')

    if (body.action === 'leave-room') {
      const room = removeUserFromRoom(user, body.room)

      room.users
        .filter(x => x !== connectionID)
        .forEach(x =>
          sendMessage(x, {
            type: 'user-left',
            room: body.room,
            user: { name: user.name, avatar: user.avatar },
          })
        )

      return
    }

    if (body.action === 'join-room') {
      const room = addUserToRoom(user, body.room)

      room.users
        .filter(x => x !== connectionID)
        .forEach(x =>
          sendMessage(x, {
            type: 'user-join',
            room: body.room,
            user: { name: user.name, avatar: user.avatar },
          })
        )

      sendMessage(connectionID, {
        type: 'joined-room',
        room: body.room,
        users: room.users.length - 1,
        user: { name: user.name, avatar: user.avatar },
      })

      return
    }

    body.user = {
      name: user.name,
      avatar: user.avatar,
    }
    body.type = 'message'

    const room = getRoom(body.room)

    room.users
      .filter(x => x !== connectionID)
      .forEach(x => sendMessage(x, body))
  })

  ws.on('close', () => {
    const user = getUser({ connectionID })
    const rooms = removeUser(connectionID)

    rooms.forEach(room =>
      room.users
        .filter(x => x !== connectionID)
        .map(x =>
          sendMessage(x, {
            type: 'user-left',
            room: room.id,
            user: { name: user.name, avatar: user.avatar },
          })
        )
    )
  })
})

setInterval(function ping() {
  wss.clients.forEach(ws => {
    const user = getUserByWs(ws)
    if (!user || user.isAlive === false) return ws.terminate()

    if (!user) {
      return
    }

    userIsAlive(user.connectionID, false)
    ws.ping()
  })
}, 30000)
