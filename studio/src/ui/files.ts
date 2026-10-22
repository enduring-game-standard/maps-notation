import callTheCoin from '../../../examples/call-the-coin.maps?raw'
import ticTacToe from '../../../examples/tic-tac-toe.maps?raw'
import { emptyNet, type Net } from '../core/model'
import { parse, print } from '../core/text'

export const EXAMPLES = [
  { name: 'Tic-tac-toe', text: ticTacToe },
  { name: 'Call the coin', text: callTheCoin },
] as const

const KEY = 'maps-studio:net'

export const loadInitial = (): Net => {
  const saved = localStorage.getItem(KEY)
  if (saved)
    try {
      return parse(saved)
    } catch {
      localStorage.removeItem(KEY)
    }
  return parse(ticTacToe)
}

export const autosave = (net: Net) => {
  try {
    localStorage.setItem(KEY, print(net))
  } catch {
    // Past the storage quota (a whole atlas) the net lives only in the page; the file on disk is the copy.
    localStorage.removeItem(KEY)
  }
}

export const newNet = (): Net => ({ ...emptyNet(), seats: [{ id: 'p1', name: 'Player 1', color: '#e4572e' }] })

export const download = (net: Net) => {
  const url = URL.createObjectURL(new Blob([print(net)], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${net.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled'}.maps`
  a.click()
  URL.revokeObjectURL(url)
}
