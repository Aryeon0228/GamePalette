/** Locally drawn landscape for framing practice. Never enters the working palette. */
export function compositionLessonSample(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 600
  const ctx = canvas.getContext('2d')!
  const sky = ctx.createLinearGradient(0, 0, 0, 600)
  sky.addColorStop(0, '#dae0db')
  sky.addColorStop(1, '#f3e4c8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 900, 600)
  ctx.fillStyle = '#fcf3d9'
  ctx.beginPath(); ctx.arc(615, 188, 48, 0, Math.PI * 2); ctx.fill()
  const mountain = (color: string, points: number[][]) => {
    ctx.fillStyle = color
    ctx.beginPath(); ctx.moveTo(0, 600)
    for (const [x, y] of points) ctx.lineTo(x, y)
    ctx.lineTo(900, 600); ctx.closePath(); ctx.fill()
  }
  mountain('#a0aba4', [[0, 321], [130, 240], [257, 295], [370, 205], [477, 268], [572, 237], [748, 296], [900, 211]])
  mountain('#637b78', [[0, 408], [167, 349], [319, 387], [477, 313], [587, 377], [770, 315], [900, 349]])
  mountain('#293c3c', [[0, 436], [155, 424], [296, 407], [365, 437], [552, 475], [900, 524]])
  ctx.strokeStyle = '#202c2d'; ctx.lineCap = 'round'
  const branch = (width: number, points: number[][]) => {
    ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y)
    ctx.stroke()
  }
  branch(22, [[279, 418], [270, 342], [288, 271], [280, 203]])
  branch(13, [[277, 323], [232, 285], [194, 231]])
  branch(11, [[283, 287], [337, 245], [351, 203]])
  ctx.fillStyle = '#314844'
  for (const [x, y, rx, ry] of [[185, 202, 59, 32], [249, 183, 63, 43], [303, 158, 64, 40], [345, 206, 66, 32], [226, 235, 48, 28]]) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.13, 0, Math.PI * 2); ctx.fill()
  }
  return canvas
}
