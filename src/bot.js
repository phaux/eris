import {EventEmitter} from 'events'
import {createContext, runInContext} from 'vm'
import fetch from 'node-fetch'
import concat from 'concat-stream'
import WebSocket from 'ws'
import camelcase from 'camelcase'
import {computePerms} from './perms'
import {uri} from './utils'
const URL = 'https://discordapp.com/api'

export class Bot extends EventEmitter {

  clientId = ''
  token = ''
  perms = 0
  ws = null
  status = {name: null, icon: null}

  constructor({clientId, token, perms}) {
    super()
    this.clientId = clientId
    this.token = token
    this.perms = computePerms(perms)
    this.initWebsocket()
    this.on('ready', ev => {
      setInterval(() => {
        this.emit('debug', 'Sending heartbeat...')
        this.ws.send(JSON.stringify({op: 1, d: Date.now()}))
      }, Math.min(ev.heartbeat_interval, 30000))
    })
    setInterval(::this.updateStatus, 120000)
    this.on('messageCreate', ::this.handleMessage)
  }

  getAuthUrl() {
    return uri`https://discordapp.com/oauth2/authorize
      ?client_id=${this.clientId}&permissions=${this.perms}&scope=bot`
  }

  async initWebsocket() {
    this.emit('debug', 'Connecting...')
    const wsurl = await fetch(`${URL}/gateway`)
      .then(res => res.json())
      .then(data => data.url)
    this.emit('debug', `Gateway: ${wsurl}`)
    this.ws = new WebSocket(wsurl)
    this.ws.on('open', () => {
      this.emit('debug', 'Websocket connection opened')
      this.ws.send(JSON.stringify({op: 2, d: {
        token: this.token, v: 3, large_threshold: 100, properties: {
          $os: process.platform, $browser: '', $device: '',
          $referrer: 'https://discordapp.com/@me',
          $referring_domain: 'discordapp.com',
        },
      }}))
    })
    this.ws.on('message', msg => {
      const {t: ev, d: data} = JSON.parse(msg)
      this.emit('debug', `Received event ${camelcase(ev)}`)
      this.emit(camelcase(ev), data)
    })
    this.ws.on('error', err => {
      this.emit('error', `Websocket error: ${err}`)
    })
    this.ws.on('close', code => {
      this.emit('debug', `Websocket connection closed: ${code}`)
    })
  }

  async api(method, url, data) {
    method = `${method}`.toUpperCase()
    url = `${url}`.replace(/^\//, '')
    this.emit('debug', `API call ${method} /${url}`)
    const res = await fetch(`${URL}/${url}`, {
      method, headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'User-Agent': 'Eris', 'Authorization': this.token,
      }, body: JSON.stringify(data),
    })
    if (res.ok) return await res.json()
    else throw new Error(
      `API error ${res.status} ${res.statusText}: ${await res.text()}`,
    )
  }

  async updateStatus() {
    const {id, icon, name} = await this.api('GET', '/oauth2/applications/@me')
    if (this.status.name == name && this.status.icon == icon) return
    await this.api('PATCH', '/users/@me', {
      username: name,
      avatar:
        await fetch(`https://cdn.discordapp.com/app-icons/${id}/${icon}.jpg`)
        .then(res => new Promise(cb => res.body.pipe(concat(cb))))
        .then(buf => 'data:image/png;base64,' + buf.toString('base64')),
    })
    this.status.name = name
    this.status.icon = icon
  }

  handleMessage(msg) {

    const [, lang, code] = [
      /```(\w*)\n([\s\S]*?[^`])```/,
      /(\w*)\s*```([^`].*?)```/,
      /(\w*)\s*``([^`][\s\S]*?)``/,
      /(\w*)\s*`([^`][\s\S]*?)`/,
    ].map(regex => msg.content.match(regex))
    .filter(match => !!match)[0] || []

    if (!code || lang != 'js') return

    const ctx = createContext({setTimeout, log: console.log})
    const result = runInContext(code, ctx, {timeout: 100})

    console.log(result)

  }

  // TODO wykucować sandbox

}
