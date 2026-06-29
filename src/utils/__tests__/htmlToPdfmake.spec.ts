import { describe, it, expect } from 'vitest'
import { htmlToPdfmake } from '../htmlToPdfmake'

describe('htmlToPdfmake', () => {
  it('returns an empty run for null/empty input', () => {
    expect(htmlToPdfmake(null)).toEqual([{ text: '' }])
    expect(htmlToPdfmake(undefined)).toEqual([{ text: '' }])
    expect(htmlToPdfmake('')).toEqual([{ text: '' }])
  })

  it('keeps plain text as a single run', () => {
    expect(htmlToPdfmake('Thallus crustose')).toEqual([{ text: 'Thallus crustose' }])
  })

  it('keeps <i> and <em> text but never applies italics', () => {
    expect(htmlToPdfmake('see <i>Lecanora</i> here')).toEqual([
      { text: 'see ' },
      { text: 'Lecanora' },
      { text: ' here' }
    ])
    expect(htmlToPdfmake('<em>x</em>')).toEqual([{ text: 'x' }])
  })

  it('marks <b> and <strong> as bold', () => {
    expect(htmlToPdfmake('a <b>B</b> c')).toEqual([
      { text: 'a ' },
      { text: 'B', bold: true },
      { text: ' c' }
    ])
    expect(htmlToPdfmake('<strong>y</strong>')).toEqual([{ text: 'y', bold: true }])
  })

  it('keeps bold, ignoring nested italics', () => {
    expect(htmlToPdfmake('<b>bold <i>both</i></b>')).toEqual([
      { text: 'bold ', bold: true },
      { text: 'both', bold: true }
    ])
  })

  it('turns <br> into a newline run', () => {
    expect(htmlToPdfmake('line1<br>line2')).toEqual([
      { text: 'line1' },
      { text: '\n' },
      { text: 'line2' }
    ])
    expect(htmlToPdfmake('a<br/>b')).toEqual([{ text: 'a' }, { text: '\n' }, { text: 'b' }])
  })

  it('strips unknown tags but keeps their text (incl. sub/sup)', () => {
    expect(htmlToPdfmake('C<sub>2</sub>O')).toEqual([{ text: 'C' }, { text: '2' }, { text: 'O' }])
    expect(htmlToPdfmake('<a href="x">link</a>')).toEqual([{ text: 'link' }])
  })

  it('decodes named and numeric HTML entities', () => {
    expect(htmlToPdfmake('a&nbsp;b')).toEqual([{ text: 'a b' }])
    expect(htmlToPdfmake('1&times;2')).toEqual([{ text: '1×2' }])
    expect(htmlToPdfmake('Tom &amp; Jerry')).toEqual([{ text: 'Tom & Jerry' }])
    expect(htmlToPdfmake('&#65;&#x42;')).toEqual([{ text: 'AB' }])
  })

  it('does not break on stray closing tags', () => {
    expect(htmlToPdfmake('text</i>more')).toEqual([{ text: 'text' }, { text: 'more' }])
  })
})
