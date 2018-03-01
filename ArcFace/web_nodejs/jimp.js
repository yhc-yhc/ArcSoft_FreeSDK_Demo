var Jimp = require("jimp");

async function main() {
	let src = './img/1.jpg';
	const image = await Jimp.read(src);
	console.log(image.bitmap)
	await image.clone().resize(200, 200).quality(60).greyscale().write("./test/1.jpg");
	await image.clone().contain(100, 100).write("./test/2.jpg");
	await image.clone().cover(100, 100).write("./test/3.jpg");
	await image.clone().crop(100, 100, 300, 300).write("./test/4.jpg");
	const image1 = await Jimp.read('./img/8888.jpg');
	await image.clone().blit(image1, 100, 100, 100, 100, 300, 300).write("./test/5.jpg");
	await image.clone().composite(image1, 100, 100).write("./test/6.jpg");
	await image.clone().mask(image1, 150, 150).write("./test/7.jpg");
	await image.clone().flip(true, true).write("./test/8.jpg");
	await image.clone().rotate(15, true).write("./test/9.jpg");
	await image.clone().rotate(15, false).write("./test/10.jpg");
	await image.clone().exifRotate().write("./test/11.jpg");
	await image.clone().opacity(0.9).write("./test/12.jpg");
}
main();