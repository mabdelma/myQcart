import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

interface S3Client {
  send(command: unknown): Promise<unknown>;
}

interface PutObjectCommand {
  input: {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType: string;
  };
}

let S3ClientCtor: (new (config: Record<string, unknown>) => S3Client) | undefined;
let PutObjectCommandCtor: (new (input: PutObjectCommand['input']) => unknown) | undefined;
let s3Client: S3Client | undefined;

try {
  const s3 = _require('@aws-sdk/client-s3');
  S3ClientCtor = s3.S3Client;
  PutObjectCommandCtor = s3.PutObjectCommand;
} catch {
  // @aws-sdk/client-s3 not installed — will fall back to local disk
}

const endpoint = process.env.S3_ENDPOINT; // R2 endpoint or S3 endpoint
const region = process.env.S3_REGION || 'auto';
const bucket = process.env.S3_BUCKET || 'qcart-uploads';
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const publicUrlBase = process.env.S3_PUBLIC_URL || endpoint;

function initS3() {
  if (s3Client) return;
  if (!S3ClientCtor || !accessKeyId || !secretAccessKey) return;

  const config: Record<string, unknown> = {
    region,
    credentials: { accessKeyId, secretAccessKey },
  };
  if (endpoint) {
    config.endpoint = endpoint;
    config.forcePathStyle = true;
  }
  s3Client = new S3ClientCtor(config);
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  initS3();

  if (s3Client && PutObjectCommandCtor) {
    const command = new PutObjectCommandCtor({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
    const base = publicUrlBase?.replace(/\/$/, '') || '';
    return `${base}/${bucket}/${key}`;
  }

  return '';
}

export function isS3Configured(): boolean {
  return !!(accessKeyId && secretAccessKey);
}
