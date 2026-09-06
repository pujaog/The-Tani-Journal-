const express = require('express')
const http = require('node:http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'] },
})

app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'tani-chat' }))

io.on('connection', (socket) => {
  socket.join('public')
  socket.on('chat:send', (payload = {}) => {
    const body = String(payload.body || '').trim().slice(0, 2000)
    if (!body) return
    io.to('public').emit('chat:message', {
      id: `${socket.id}-${Date.now()}`,
      body,
      authorName: String(payload.authorName || 'Guest').slice(0, 80),
      createdAt: new Date().toISOString(),
    })
  })
})

const port = Number(process.env.CHAT_PORT || 4000)
server.listen(port, () => console.log(`Tani chat listening on ${port}`))