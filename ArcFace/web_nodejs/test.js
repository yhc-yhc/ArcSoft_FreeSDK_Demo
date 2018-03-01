var ffi = require('ffi');
var ref = require('ref');
var fs = require('fs');
var ArcSoftFD = require('./ArcSoftFD.js');
var ArcSoftFR = require('./ArcSoftFR.js');
var ArcSoftBase = require('./ArcSoftBase.js');
var Jimp = require("jimp");

var APPID = '5Q3UUrYv2T1qAXtsdGFJXaTMjHdgvUpiktzxLhZLcYC1';
var FD_SDKKEY = 'DcHzisteEJPMcDM9ZtPkRGbuvA9FJRUuqvaQNjCBucer';
var FR_SDKKEY = 'DcHzisteEJPMcDM9ZtPkRGc35ZQS8XUwaVtYQ4mCuyT6';

//init Engine
var MAX_FACE_NUM = 50;
var FD_WORKBUF_SIZE = 20 * 1024 * 1024;
var FR_WORKBUF_SIZE = 40 * 1024 * 1024;
var pFDWorkMem = ArcSoftBase.malloc(FD_WORKBUF_SIZE);
var pFRWorkMem = ArcSoftBase.malloc(FR_WORKBUF_SIZE);

var phFDEngine = ref.ref(new Buffer(ArcSoftBase.MIntPtr_t.size));
var ret = ArcSoftFD.AFD_FSDK_InitialFaceEngine(APPID, FD_SDKKEY, pFDWorkMem, FD_WORKBUF_SIZE, phFDEngine, ArcSoftFD.OrientPriority.AFD_FSDK_OPF_0_HIGHER_EXT, 32, MAX_FACE_NUM);
if (ret != 0) {
	ArcSoftBase.free(pFDWorkMem);
	ArcSoftBase.free(pFRWorkMem);
	console.log('AFD_FSDK_InitialFaceEngine ret == ' + ret);
	process.exit();
}
var hFDEngine = ref.deref(phFDEngine);
//print FD Engine version
var pVersionFD = ArcSoftFD.AFD_FSDK_GetVersion(hFDEngine);
var versionFD = pVersionFD.deref();
console.log('' + versionFD.lCodebase + ' ' + versionFD.lMajor + ' ' + versionFD.lMinor + ' ' + versionFD.lBuild);
console.log(versionFD.Version);
console.log(versionFD.BuildDate);
console.log(versionFD.CopyRight);

var phFREngine = ref.ref(new Buffer(ArcSoftBase.MIntPtr_t.size));
ret = ArcSoftFR.AFR_FSDK_InitialEngine(APPID, FR_SDKKEY, pFRWorkMem, FR_WORKBUF_SIZE, phFREngine);
if (ret != 0) {
	ArcSoftFD.AFD_FSDK_UninitialFaceEngine(hFDEngine);
	ArcSoftBase.free(pFDWorkMem);
	ArcSoftBase.free(pFRWorkMem);
	console.log('AFR_FSDK_InitialEngine ret == ' + ret);
	System.exit(0);
}
var hFREngine = ref.deref(phFREngine);

//print FR Engine version
var pVersionFR = ArcSoftFR.AFR_FSDK_GetVersion(hFREngine);
var versionFR = pVersionFR.deref();
console.log('' + versionFR.lCodebase + ' ' + versionFR.lMajor + ' ' + versionFR.lMinor + ' ' + versionFR.lBuild);
console.log(versionFR.Version);
console.log(versionFR.BuildDate);
console.log(versionFR.CopyRight);

function doFaceDetection(filename, faces_callback, width, height, format) {

	if (arguments.length === 2) {
		ArcSoftBase.loadImage(filename, function(err, inputImage) {
			if (err) throw err;
			ArcSoftFD.process(hFDEngine, inputImage, faces_callback);
		});
	} else if (arguments.length === 5) {
		ArcSoftBase.loadYUVImage(filename, width, height, format, (err, inputImage) => {
			if (err) throw err;
			ArcSoftFD.process(hFDEngine, inputImage, faces_callback);
		});

	} else {
		throw new Error('wrong number of arguments');
	}
}

function faceDetection(src) {
	return new Promise((resolve, reject) => {
		const image = fs.readFileSync(src);
		var imageRawBuffer = new Buffer(image, 'base64');

		doFaceDetection(imageRawBuffer, function(err, asvl, faces) {
			if (err) {
				reject(err)
			} else {
				resolve([asvl, faces])
			}
		});
	});
}


const facet2m = {
	faceMap: {},
	t: Date.now()
};
let scoreLine = 0.667;
let groupNum = 1000;

async function addFace(facet2m, img, asvl, faces, faceIdx, now, src) {

	let flag_new_face = true;
	var featureB = ArcSoftFR.extractFeature(hFREngine, asvl, faces.info[faceIdx]);

	for (let t in facet2m.faceMap) {
		var featureA = ArcSoftFR.extractFeature(hFREngine, facet2m.faceMap[t].asvl, facet2m.faceMap[t].face);
		// console.log(102, featureA, featureA.pbFeature.length, featureA.lFeatureSize, featureA['ref.buffer'].toString('Base64'))
		// {pbFeature: new Buffer(0), lFeatureSize: 22020, 'ref.buffer': new Buffer('QG4NAwAAAAAEVgAAAAAAAA==', 'Base64')}
		var score = ArcSoftFR.compareFaceSimilarity(hFREngine, featureA, featureB)
		// ArcSoftBase.free(featureA.pbFeature);
		// console.log(108, src, faceIdx, score, score > scoreLine)
		if (score > scoreLine) {
			// console.log(src, faceIdx, score, 'not a new face.')
			flag_new_face = false;
			break;
		}
	}
	if (flag_new_face) {
		// console.log(117, featureB, featureB.pbFeature.length, featureB.lFeatureSize, featureB['ref.buffer'].toString('Base64'))
		console.log('add a new face', src, faceIdx)
		// ArcSoftBase.free(featureB.pbFeature);
		const img1 = img.clone();
		const p = await img1.crop(faces.info[faceIdx].left, faces.info[faceIdx].top, faces.info[faceIdx].right - faces.info[faceIdx].left, faces.info[faceIdx].bottom - faces.info[faceIdx].top);
		let time = facet2m.t;
		await require('fs-extra').ensureDir(`./faces/${time}/`)
		await p.write(`./faces/${time}/${now}.jpg`);
		facet2m.faceMap[now] = {
			asvl: asvl,
			face: faces.info[faceIdx]
		}
	}
}

async function process(src) {
	try {
		const [asvl, faces] = await faceDetection(src);
		// console.log(130, asvl, faces)
		const img = await Jimp.read(src);
		for (let faceIdx in faces.info) {
			let now = Date.now();
			let bflag_t2m = now - facet2m.t < 1200000;
			let bflag_len = Object.keys(facet2m.faceMap).length;

			if (bflag_t2m && bflag_len < groupNum) {
				addFace(facet2m, img, asvl, faces, faceIdx, now, src);
			} else {
				facet2m.faceMap = {};
				facet2m.t = Date.now();
				addFace(facet2m, img, asvl, faces, faceIdx, now, src);
			}
		}
	} catch (e) {
		console.log(e);
	}
}

async function main() {
	const ary = ['./img/1.jpg', './img/2.jpg', './img/3.jpg', './img/4.jpg', './img/5.jpg', './img/6.jpg', './img/7.jpg', './img/8.jpg'];
	// const ary = ['./img/1.jpg', './img/2.jpg'];

	for (let src of ary) {
		console.log(src);
		await process(src);
	}
}
main();