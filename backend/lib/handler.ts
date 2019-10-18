import { Server } from 'ws'
import http from 'http'
import { URL } from 'url'
import express from 'express'
import randomString from 'randomstring'
import { removeUser, getUser, getRoom, addUserToRoom } from './storage'
import { sendMessage } from './sent-message'

const app = express()
const port = process.env.PORT || 5000

var server = http.createServer(app)
server.listen(port)

console.log('http server listening on %d', port)

var wss = new Server({ server: server })
console.log('websocket server created')

wss.on('connection', async (ws, req) => {
  const connectionID = randomString.generate()
  const query = new URL(req.url).searchParams
  const name = query.get('name')
  const avatar = query.get('avatar')

  getUser({ connectionID, ws, name, avatar })

  console.log('websocket connection open')

  ws.on('message', data => {
    const user = getUser({ connectionID })
    const body = JSON.parse(String(data) || '{}')
    console.log(body)
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

      return
    }

    body.user = {
      name: user.name,
      avatar: user.avatar,
    }
    body.type = 'message'

    const room = getRoom(body.room)

    room.users
      // .filter(x => x !== connectionID)
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
