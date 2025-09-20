const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const processImage = async (filePath, filename) => {
  try {
    const processedDir = path.join(path.dirname(filePath), 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const outputFilename = 'processed-' + filename;
    const outputPath = path.join(processedDir, outputFilename);

    // Resize and optimize image
    await sharp(filePath)
      .resize(1200, 1200, { // Max dimensions 1200x1200
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 80,
        progressive: true 
      })
      .toFile(outputPath);

    // Delete original file after processing
    fs.unlinkSync(filePath);

    return outputPath;

  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
};

const getPublicUrl = (filePath) => {
  // In production, this would return a CDN URL
  // For development, we'll use a relative path
  const relativePath = filePath.replace(/^.*[\\/]uploads[\\/]/, 'uploads/');
  return `/api/${relativePath}`;
};

module.exports = {
  processImage,
  getPublicUrl
};