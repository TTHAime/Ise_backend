import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';
import { Readable } from 'stream';

export type OutputFormat = 'webp' | 'jpeg' | 'png';
export type NamingMode = 'unique' | 'stable';
/**
 * Naming strategy:
 *  - 'unique': append timestamp + random suffix to avoid collision.
 *  - 'stable': use fixed name (useful for avatar/profile images).
 */

export interface UploadImg_CloundOptions {
  folder: string;
  prefix?: string;
  naming?: NamingMode;
  overwrite?: boolean;
  width?: number;
  height?: number;
  quality?: number;
  format?: OutputFormat;
}

export interface UploadedImg_CloundInfo {
  url: string;
  secureUrl: string;
  publicId: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
  version: number;
}

const randomSuffix = (len = 8): string =>
  Math.random()
    .toString(36)
    .slice(2, 2 + len);

export async function uploadImgBuffer_Clound(
  fileBuffer: Buffer,
  {
    folder,
    prefix = 'file',
    naming = 'unique',
    overwrite = false,
    width = 500,
    height = 500,
    quality = 80,
    format = 'webp',
  }: UploadImg_CloundOptions
): Promise<UploadedImg_CloundInfo> {
  // 1) resize/compress
  const processed = await sharp(fileBuffer)
    .resize(width, height, { fit: 'cover', withoutEnlargement: true })
    .toFormat(format, { quality })
    .toBuffer();

  // 2) Generate a `public_id` for Cloudinary
  const base = prefix;
  const publicId =
    naming === 'stable'
      ? `${base}` // ชื่อคงที่
      : `${base}_${Date.now()}_${randomSuffix()}`; // กันชน (ไม่ชนกัน)

  // 3) Upload via `upload_stream` for memory-only buffers.
  const stream = Readable.from(processed);

  const result: UploadApiResponse = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite,
      },
      (err, res) => (err ? reject(err) : resolve(res!))
    );
    stream.pipe(uploadStream);
  });

  return {
    url: result.url!,
    secureUrl: result.secure_url!,
    publicId: result.public_id!,
    bytes: result.bytes!,
    width: result.width!,
    height: result.height!,
    format: result.format!,
    version: result.version!,
  };
}
