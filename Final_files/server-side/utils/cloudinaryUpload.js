// utils/cloudinaryUpload.js
const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");
const { Readable } = require("stream");

// Check if Cloudinary is properly configured
console.log("Cloudinary config check:");
console.log("Cloud name:", process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing");
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Set" : "Missing");
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadCompressedImage = async (buffer, filename) => {
  try {
    console.log(`Starting upload for file: ${filename}`);
    console.log(`Buffer size: ${buffer.length} bytes`);

    const compressedBuffer = await sharp(buffer)
      .resize({ width: 800 }) // Resize to width 800px max
      .jpeg({ quality: 70 })   // Compress
      .toBuffer();

    console.log(`Compressed buffer size: ${compressedBuffer.length} bytes`);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "subtask_images",
          public_id: filename,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload successful:", result.secure_url);
            resolve(result);
          }
        }
      );

      Readable.from(compressedBuffer).pipe(stream);
    });
  } catch (error) {
    console.error("Error in uploadCompressedImage:", error);
    throw error;
  }
};