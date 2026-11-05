// setup-s3-correct-bucket.js
import { 
  S3Client, 
  CreateBucketCommand, 
  PutBucketWebsiteCommand, 
  PutPublicAccessBlockCommand, 
  PutBucketPolicyCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { lookup as mimeLookup } from 'mime-types';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const BUCKET = "www.maapark.in";
const REGION = "us-east-1";
const BASE_DIR = __dirname;

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  }
});

// Paths to include
const INCLUDE_PATHS = [
  'index.html',
  'style.css',
  'script.js',
  'google52d32ae7afde8330.html',
  'team-photos',
];

const SKIP_PATTERNS = [
  'node_modules', '.git', '.insforge', '.agents', '.env', 'backend.js', 'database.js'
];

function collectFiles(dirPath) {
  const files = [];
  readdirSync(dirPath).forEach(entry => {
    if (SKIP_PATTERNS.some(p => entry.startsWith(p))) return;
    const fullPath = join(dirPath, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  });
  return files;
}

async function run() {
  console.log(`🚀 Starting S3 Setup for Bucket: ${BUCKET}...`);

  try {
    // 1. Create Bucket
    console.log("1. Creating bucket...");
    await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log("   ✅ Bucket created!");
  } catch (err) {
    if (err.name === "BucketAlreadyOwnedByYou") {
      console.log("   ✅ Bucket already exists and is owned by you.");
    } else {
      console.error("   ❌ Error creating bucket:", err.message);
      throw err;
    }
  }

  // 2. Disable Block Public Access
  try {
    console.log("2. Disabling Block Public Access...");
    await client.send(new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false
      }
    }));
    console.log("   ✅ Public access allowed!");
  } catch (err) {
    console.error("   ❌ Error disabling block public access:", err.message);
    throw err;
  }

  // 3. Put Bucket Website Configuration
  try {
    console.log("3. Enabling Static Website Hosting...");
    await client.send(new PutBucketWebsiteCommand({
      Bucket: BUCKET,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: "index.html" }
      }
    }));
    console.log("   ✅ Static Website Hosting enabled!");
  } catch (err) {
    console.error("   ❌ Error setting website hosting:", err.message);
    throw err;
  }

  // 4. Put Bucket Policy
  try {
    console.log("4. Applying public read bucket policy...");
    const policy = {
      Version: "2012-10-17",
      Statement: [{
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${BUCKET}/*`
      }]
    };
    await client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy)
    }));
    console.log("   ✅ Public bucket policy applied!");
  } catch (err) {
    console.error("   ❌ Error setting bucket policy:", err.message);
    throw err;
  }

  // 5. Deploy Files
  console.log("5. Uploading files...");
  const filesToUpload = [];
  INCLUDE_PATHS.forEach(item => {
    const fullPath = join(BASE_DIR, item);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        collectFiles(fullPath).forEach(f => {
          const s3Key = relative(BASE_DIR, f).replace(/\\/g, '/');
          filesToUpload.push({ localPath: f, s3Key });
        });
      } else {
        filesToUpload.push({ localPath: fullPath, s3Key: item });
      }
    } catch {
      console.warn(`⚠️ Skipping missing path: ${item}`);
    }
  });

  for (const { localPath, s3Key } of filesToUpload) {
    const body = readFileSync(localPath);
    const contentType = mimeLookup(localPath) || 'application/octet-stream';
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: contentType
    }));
    console.log(`   Uploaded: ${s3Key}`);
  }

  console.log(`\n🎉 Success! Website files deployed to http://${BUCKET}.s3-website.us-east-1.amazonaws.com`);
}

run().catch(err => {
  console.error("❌ Process failed:", err.message);
});
