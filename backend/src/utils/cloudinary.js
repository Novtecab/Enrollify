const cloudinary = require('cloudinary').v2;

/**
 * Cloudinary configuration and utility functions
 * Handles file upload, management, and security features
 */
class CloudinaryService {
  constructor() {
    this.configured = false;
    this.init();
  }

  /**
   * Initialize Cloudinary configuration
   */
  init() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary credentials not found. File upload will be disabled.');
      return;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    this.configured = true;
    console.log('✅ Cloudinary configured successfully');
  }

  /**
   * Check if Cloudinary is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return this.configured;
  }

  /**
   * Upload file to Cloudinary
   * @param {Buffer|string} file - File buffer or file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, options = {}) {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const defaultOptions = {
        resource_type: 'auto',
        folder: 'uniapply-hub',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        quality: 'auto',
        fetch_format: 'auto',
        flags: 'sanitize', // Sanitize SVG files
        ...options
      };

      const result = await cloudinary.uploader.upload(file, defaultOptions);
      
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error.message);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - File public ID
   * @param {string} resourceType - Resource type (image, video, raw)
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId, resourceType = 'auto') {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      
      return result;
    } catch (error) {
      console.error('❌ Cloudinary deletion error:', error.message);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate secure URL for file access
   * @param {string} publicId - File public ID
   * @param {Object} options - Transformation options
   * @returns {string} Secure URL
   */
  generateSecureUrl(publicId, options = {}) {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    const defaultOptions = {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      ...options
    };

    return cloudinary.url(publicId, defaultOptions);
  }

  /**
   * Get file information
   * @param {string} publicId - File public ID
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(publicId) {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        url: result.secure_url,
        createdAt: result.created_at,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('❌ Cloudinary info error:', error.message);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object from multer
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png')
      .split(',')
      .map(type => type.trim().toLowerCase());

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(`File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check MIME type
    const allowedMimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png'
    };

    const expectedMimeType = allowedMimeTypes[fileExtension];
    if (expectedMimeType && file.mimetype !== expectedMimeType) {
      errors.push(`MIME type mismatch. Expected ${expectedMimeType}, got ${file.mimetype}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate upload preset for specific document types
   * @param {string} category - Document category (cv, transcript, etc.)
   * @returns {Object} Upload options
   */
  getUploadOptions(category) {
    const baseOptions = {
      folder: `uniapply-hub/${category}`,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    };

    switch (category) {
      case 'cv':
        return { ...baseOptions, tags: ['cv', 'resume'] };
      case 'transcript':
        return { ...baseOptions, tags: ['transcript', 'academic'] };
      case 'recommendation':
        return { ...baseOptions, tags: ['recommendation', 'letter'] };
      case 'portfolio':
        return { ...baseOptions, tags: ['portfolio', 'work'] };
      default:
        return { ...baseOptions, tags: ['document'] };
    }
  }
}

// Export singleton instance
const cloudinaryService = new CloudinaryService();

module.exports = cloudinaryService;