var ffi = require('ffi')
var ref = require('ref')
var fs = require('fs')
var ArcSoftFD = require('./ArcSoftFD.js')
var ArcSoftFR = require('./ArcSoftFR.js')
var ArcSoftBase = require('./ArcSoftBase.js')
var Jimp = require("jimp")

var APPID = '5Q3UUrYv2T1qAXtsdGFJXaTMjHdgvUpiktzxLhZLcYC1'
var FD_SDKKEY = 'DcHzisteEJPMcDM9ZtPkRGbuvA9FJRUuqvaQNjCBucer'
var FR_SDKKEY = 'DcHzisteEJPMcDM9ZtPkRGc35ZQS8XUwaVtYQ4mCuyT6'

//init Engine
var MAX_FACE_NUM = 50
var FD_WORKBUF_SIZE = 20 * 1024 * 1024
var FR_WORKBUF_SIZE = 40 * 1024 * 1024
var pFDWorkMem = ArcSoftBase.malloc(FD_WORKBUF_SIZE)
var pFRWorkMem = ArcSoftBase.malloc(FR_WORKBUF_SIZE)

var phFDEngine = ref.ref(new Buffer(ArcSoftBase.MIntPtr_t.size))
var ret = ArcSoftFD.AFD_FSDK_InitialFaceEngine(APPID, FD_SDKKEY, pFDWorkMem, FD_WORKBUF_SIZE, phFDEngine, ArcSoftFD.OrientPriority.AFD_FSDK_OPF_0_HIGHER_EXT, 32, MAX_FACE_NUM)
if (ret != 0) {
	ArcSoftBase.free(pFDWorkMem)
	ArcSoftBase.free(pFRWorkMem)
	console.log('AFD_FSDK_InitialFaceEngine ret == ' + ret)
	process.exit()
}
var hFDEngine = ref.deref(phFDEngine)
	//print FD Engine version
var pVersionFD = ArcSoftFD.AFD_FSDK_GetVersion(hFDEngine)
var versionFD = pVersionFD.deref()
console.log('' + versionFD.lCodebase + ' ' + versionFD.lMajor + ' ' + versionFD.lMinor + ' ' + versionFD.lBuild)
console.log(versionFD.Version)
console.log(versionFD.BuildDate)
console.log(versionFD.CopyRight)

var phFREngine = ref.ref(new Buffer(ArcSoftBase.MIntPtr_t.size))
ret = ArcSoftFR.AFR_FSDK_InitialEngine(APPID, FR_SDKKEY, pFRWorkMem, FR_WORKBUF_SIZE, phFREngine)
if (ret != 0) {
	ArcSoftFD.AFD_FSDK_UninitialFaceEngine(hFDEngine)
	ArcSoftBase.free(pFDWorkMem)
	ArcSoftBase.free(pFRWorkMem)
	console.log('AFR_FSDK_InitialEngine ret == ' + ret)
	System.exit(0)
}
var hFREngine = ref.deref(phFREngine)

//print FR Engine version
var pVersionFR = ArcSoftFR.AFR_FSDK_GetVersion(hFREngine)
var versionFR = pVersionFR.deref()
	// console.log('' + versionFR.lCodebase + ' ' + versionFR.lMajor + ' ' + versionFR.lMinor + ' ' + versionFR.lBuild)
	// console.log(versionFR.Version)
	// console.log(versionFR.BuildDate)
	// console.log(versionFR.CopyRight)

const facet2m = {
	faceMap: {},
	t: Date.now()
}
const face2m = {}
let scoreLine = 0.667

async function main() {
	console.log('main')
	const ary = ['./img/1.jpg', './img/2.jpg', './img/3.jpg', './img/4.jpg', './img/5.jpg', './img/6.jpg', './img/7.jpg', './img/8.jpg']
		// const ary = ['./img/1.jpg']

	for (let src of ary) {
		await process(src)
	}
	console.log(Object.keys(face2m).length)
}
main()

async function process(src) {
	try {
		await faceDetection(src)
	} catch (e) {
		console.log(e)
	}
}

function faceDetection(src) {
	return new Promise((resolve, reject) => {
		const image = fs.readFileSync(src)
		var imageRawBuffer = new Buffer(image, 'base64')

		doFaceDetection(imageRawBuffer, async function(err, asvl, faces) {
			if (err) {
				reject(err)
			} else {
				// resolve([asvl, faces])
				console.log('==============>', src, faces.nFace)
				for (let i = 0; i < faces.nFace; i++) {
					console.log(2)
					const feature = ArcSoftFR.extractFeature(hFREngine, asvl, faces.info[i])
					let featureStr = feature.toString('base64')
					// console.log(featureStr)
					let key = `${src.replace(/\//g, '-')}_${i}`
					if (!Object.keys(face2m).length) {
						face2m[key] = featureStr
					}
					let addFlag = true

					for (let fk in face2m) {
						if (fk == key) continue
						let score = ArcSoftFR.compareFaceFromBase64(hFREngine, featureStr, face2m[fk])
						console.log(key, fk, score, score < scoreLine)

						if (score > scoreLine) {
							addFlag = false
							break
						}
					}

					if (addFlag) {
						face2m[key] = feature
						const img = await Jimp.read(src)
						const img1 = await img.clone()
						const p = await img1.crop(faces.info[i].left, faces.info[i].top, faces.info[i].right - faces.info[i].left, faces.info[i].bottom - faces.info[i].top)
						await require('fs-extra').ensureDir(`./faces/`)
						await p.write(`./faces/${key}.jpg`)
					}
				}
				console.log(113, Object.keys(face2m).length)
				resolve(0)
			}
		})
	})
}

function doFaceDetection(filename, faces_callback, width, height, format) {

	if (arguments.length === 2) {
		ArcSoftBase.loadImage(filename, function(err, inputImage) {
			if (err) throw err
			ArcSoftFD.process(hFDEngine, inputImage, faces_callback)
		})
	} else if (arguments.length === 5) {
		ArcSoftBase.loadYUVImage(filename, width, height, format, (err, inputImage) => {
			if (err) throw err
			ArcSoftFD.process(hFDEngine, inputImage, faces_callback)
		})

	} else {
		throw new Error('wrong number of arguments')
	}
}
exports.faceProcess = process
exports.face2m = face2m