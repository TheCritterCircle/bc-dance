const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

var startTime
var step
var draw
{
	var tpsC = 0
	var fpsC = 0
	var getSec = () => { return (performance.now() - startTime) / 1000 }

	step = function () {
		let now = getSec()
		document.getElementById("tps").innerHTML = Math.round(1 / (now - tpsC))
		tpsC = now
		window.setTimeout(step, 8.333333333333334) //120 tps
	}

	draw = function (ms) {
		let sec = getSec()
		let beat = secToBeat(sec)
		let size = 32 //temporary render variable
		let speed = 4 //temporary render variable
		ctx.fillStyle = "#000000"
		ctx.fillRect(0, 0, 640, 480)//temporary background
		for (let n in notes) {
			if (notes[n].beat - beat > 0)
				ctx.fillStyle = {
					'M': '#ff0000',
					'1': '#ffffff',
					'2': '#00ffff',
					'4': '#00ff00'
				}[notes[n].type]
			else
				ctx.fillStyle = '#ff00ff'
			ctx.fillRect(
				notes[n].column * size,
				(notes[n].beat - beat) * speed * size,
				size,
				(notes[n].beatLength * speed * size + size || size)
			)
		}

		document.getElementById("fps").innerHTML = Math.round(1 / (sec - fpsC))
		fpsC = sec
		requestAnimationFrame(draw)
	}
}

addEventListener("keydown", press(true))
addEventListener("keyup", press(false))

var keyInput = [
	{
		up: false,
		down: false,
		left: false,
		right: false
	},
	{
		up: false,
		down: false,
		left: false,
		right: false
	}
]

function press(v) {
	return function (key) {
		switch (key.code) {
			case "ArrowUp":
				keyInput[1].up = v; break
			case "ArrowDown":
				keyInput[1].down = v; break
			case "ArrowLeft":
				keyInput[1].left = v; break
			case "ArrowRight":
				keyInput[1].right = v; break
		}
	}
}

/**
 * @type {[[number, number]...]}
 * [[time (sec), bpm]...]
 */
var bpms
var notes = []
var chartPath = 'https://tumpnt.github.io/stepmania-js/Songs/WinDEU Hates You Forever/Sebben Crudele/'
{
	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4 && xhr.status == 200) {
			let data = parseSM(xhr.responseText)

			canvas.onclick = () => {
				startGame(data)
				canvas.onclick = null
			}
		}
	}
	xhr.open('GET', chartPath + 'Sebben Crudele.sm')
	xhr.send()
}
function parseSM(sm) {
	var out = {}
	sm = sm.replace(/\/\/.*/g, '')
		.replace(/\r?\n|\r/g, '')
		.split(';')
	for (let i = sm.length - 1; i >= 0; i -= 1) {
		if (sm[i]) {
			sm[i] = sm[i].split(/:/g)
			for (let p in sm[i])
				sm[i][p] = sm[i][p].trim()
		}
		else
			sm.splice(i, 1)
	}
	var steps
	for (let i in sm) {
		let p = sm[i]
		switch (p[0]) {
			case '#MUSIC':
				out.audio = new Audio(chartPath + p[1])
				break
			case '#BPMS':
				bpms = [p[1].split('=')]//doesn't work with bpm changes
				bpms[0][0] = Number(bpms[0][0])
				bpms[0][1] = Number(bpms[0][1])
				break
			case '#NOTES':
				steps = p[6].split(',') //only grabs first difficulty
				break
			default:
				console.log(`Unrecognised sm property "${p[0]}"`)
		}
	}
	{
		let t = [[steps, '#NOTES'], [bpms, '#BPMS']]
		for (let i in t)
			if (!t[i][0]) throw `Missing neccesary info (${t[i][1]})`
	}
	{
		let unfinHolds = [null, null, null, null]
		for (let m in steps) { // m for measure
			steps[m] = steps[m].trim()
			if (steps[m].length % 4) // if length is not divisible by 4
				throw `Invalid length on measure ${m}, ${steps[m].length}, ${steps[m]}`
			steps[m] = steps[m].match(/(.{4})/g)

			let t = steps[m].length // t for time (time between notes)
			for (let l in steps[m]) { // l for line
				let nt = steps[m][l]
				let note = [{}, {}, {}, {}]
				let b = m * 4 + l / t * 4 // for efficiency
				for (let c = 0; c < note.length; c++) { // c for column
					switch (nt[c]) {
						case '3':
							if (unfinHolds[c] == null) throw `hold end without any hold before at measure ${m}, line ${l}`
							{
								let i = notes[unfinHolds[c]]
								i.beatEnd = b
								i.beatLength = b - i.beat
								i.secEnd = beatToSec(b)
								i.secLength = beatToSec(b - i.beat)
							}
							// add more hold end script
							unfinHolds[c] = null
						case '0':
							note[c] = null
							continue
						case '4':
						case '2':
							if (unfinHolds[c]) throw `new hold started before last ended at measure ${m}, line ${l}`
							unfinHolds[c] = notes.length + c
						case '1':
						case 'M':
							note[c].type = nt[c]
							break
						default:
							throw `invalid note type ${nt[c]} at measure ${m}, line ${l}`
					}
					note[c].beat = b
					note[c].sec = beatToSec(b)
					note[c].column = c
				}
				notes = notes.concat(note)
			}
		}
		notes = notes.filter(i => i !== null)
	}
	return out
}

function secToBeat(sec) {
	return sec * bpms[0][1] / 60 //doesn't work with multiple bpm changes
}
function beatToSec(beat) {
	return beat / bpms[0][1] * 60 //doesn't work with multiple bpm changes
}

function startGame({ audio }) {
	if (audio) audio.play()
	startTime = performance.now()
	step()
	requestAnimationFrame(draw)
}

ctx.fillStyle = "black"
ctx.fillRect(0, 0, 640, 480)