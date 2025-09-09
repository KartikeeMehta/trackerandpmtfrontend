const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
const toIco = require("png-to-ico");

async function makeBmp(srcPath, width, height, outPath) {
  const img = await Jimp.read(srcPath);
  img.cover(width, height).background(0xffffffff); // white background
  await img.writeAsync(outPath); // extension .bmp determines output
}

async function makeIcoFromPng(srcPath, outPath) {
  // Generate standard icon sizes
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const tmpDir = path.join(path.dirname(outPath), "tmp-ico");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const pngPaths = [];
  const base = await Jimp.read(srcPath);
  for (const sz of sizes) {
    const p = path.join(tmpDir, `icon-${sz}.png`);
    const clone = base.clone();
    await clone
      .contain(
        sz,
        sz,
        Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE
      )
      .writeAsync(p);
    pngPaths.push(p);
  }
  const buf = await toIco(pngPaths);
  fs.writeFileSync(outPath, buf);

  // Cleanup temp files
  for (const p of pngPaths) {
    try {
      fs.unlinkSync(p);
    } catch (_) {}
  }
  try {
    fs.rmdirSync(tmpDir);
  } catch (_) {}
}

async function run() {
  const root = __dirname;
  const pub = path.join(root, "public");
  const outSidebar = path.join(pub, "installerSidebar.bmp");
  const outHeader = path.join(pub, "installerHeader.bmp");

  // Choose sources from provided PNGs
  const bannerSrcCandidates = [
    "tracker_software_logo.png",
    "splash_icon_tracker.png",
    "logo_favicon.png",
  ];
  const headerSrcCandidates = [
    "splash_icon_tracker.png",
    "logo_favicon.png",
    "tracker_software_logo.png",
  ];
  const iconSrcCandidates = [
    "for_tray.png",
    "for_tray_icon.png",
    "logo_favicon.png",
    "splash_icon_tracker.png",
  ];

  const pickExisting = (names) =>
    names.map((n) => path.join(pub, n)).find((p) => fs.existsSync(p));

  const bannerSrc = pickExisting(bannerSrcCandidates);
  const headerSrc = pickExisting(headerSrcCandidates);
  const iconSrc = pickExisting(iconSrcCandidates);

  if (!bannerSrc && !headerSrc && !iconSrc) {
    console.log("No source images found in public/. Skipping.");
    return;
  }

  // NSIS requires exact BMP sizes
  if (bannerSrc) {
    await makeBmp(bannerSrc, 164, 314, outSidebar);
    console.log("Generated", outSidebar);
  }

  if (headerSrc) {
    await makeBmp(headerSrc, 150, 57, outHeader);
    console.log("Generated", outHeader);
  }

  // Create Windows ICO for title bar/installer if possible
  if (iconSrc) {
    const icoOut = path.join(root, "build", "icon.ico");
    if (!fs.existsSync(path.dirname(icoOut)))
      fs.mkdirSync(path.dirname(icoOut), { recursive: true });
    await makeIcoFromPng(iconSrc, icoOut);
    console.log("Generated", icoOut);
  }
}

run().catch((e) => {
  console.error("Asset conversion failed:", e);
  process.exit(1);
});
