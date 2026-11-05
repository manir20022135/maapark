// deploy-s3.js
// Uploads all static website files to an AWS S3 bucket
// Configured for Static Website Hosting
//
// Prerequisites:
//   1. Create an S3 bucket with Static Website Hosting enabled (see aws-setup-guide.md)
//   2. Set your AWS credentials in environment variables or ~/.aws/credentials
//   3. npm install (installs @aws-sdk/client-s3)
//
// Usage:
//   AWS_ACCESS_KEY_ID=xxx \
//   AWS_SECRET_ACCESS_KEY=yyy \
//   S3_BUCKET=your-bucket-name \
//   S3_REGION=ap-south-1 \
//   node deploy-s3.js

import 'dotenv/config';
import { S3Client, PutObjectCommand, PutBucketWebsiteCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { lookup as mimeLookup } from 'mime-types';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const BUCKET   = process.env.S3_BUCKET || 'www.maapark.in';
const REGION   = process.env.S3_REGION || 'us-east-1';
const BASE_DIR = __dirname; // the project root

// Files and folders to include in the S3 upload
const INCLUDE_PATHS = [
  'index.html',
  'style.css',
  'script.js',
  'championship.html',
  'championship-exam.html',
  'championship-verify.html',
  'master_candidate_registry.js',
  'master_candidates.json',
  'quiz-teaser.html',
  'quiz.html',
  'growth-loop-widget.js',
  'google52d32ae7afde8330.html', // Google Search Console verification
  'favicon.ico',
  'favicon.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'maa-park-logo.jpg',
  'ambassador.html',
  'admin-ambassadors.html',
  'ambassador-policies.html',
  'ambassador-banner.jpg',
  'team-photos',                  // folder — uploaded recursively
];

// Clean URL Aliases (without .html extension) for clean routing on AWS S3
const CLEAN_URL_ALIASES = [
  { s3Key: 'ambassador', localFile: 'ambassador.html' },
  { s3Key: 'ambassador/index.html', localFile: 'ambassador.html' },
  { s3Key: 'ambassador/policies', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/policies/index.html', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/terms', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/terms/index.html', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/privacy', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/privacy/index.html', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/refund', localFile: 'ambassador-policies.html' },
  { s3Key: 'ambassador/refund/index.html', localFile: 'ambassador-policies.html' },
  { s3Key: 'admin/ambassadors', localFile: 'admin-ambassadors.html' },
  { s3Key: 'admin/ambassadors/index.html', localFile: 'admin-ambassadors.html' },
  { s3Key: 'admin/ambassador', localFile: 'admin-ambassadors.html' },
  { s3Key: 'championship', localFile: 'championship.html' },
  { s3Key: 'championship/index.html', localFile: 'championship.html' },
  { s3Key: 'championship/exam', localFile: 'championship-exam.html' },
  { s3Key: 'championship/exam/index.html', localFile: 'championship-exam.html' },
  { s3Key: 'championship/verify', localFile: 'championship-verify.html' },
  { s3Key: 'quiz', localFile: 'quiz-teaser.html' },
  { s3Key: 'quiz/index.html', localFile: 'quiz-teaser.html' },
];

// Files/patterns to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  '.insforge',
  '.agents',
  '.env',
  '.env.example',
  'backend.js',
  'database.js',
  'seed-mongodb.js',
  'deploy-s3.js',
  'package.json',
  'package-lock.json',
  'migrations',
  'functions',
  'skills-lock.json',
  'AGENTS.md',
  'team_and_about_us.md',
  'team_documentation.md',
  '.gitignore',
];

// ─── S3 Client ───────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively collect all files from a directory
 */
function collectFiles(dirPath) {
  const files = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    if (SKIP_PATTERNS.some(p => entry.startsWith(p))) continue;
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Determine cache-control header based on file type
 */
function cacheControl(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (['.html', '.css', '.js'].includes(ext) || !ext) return 'no-cache, no-store, must-revalidate';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'].includes(ext)) return 'public, max-age=31536000';
  return 'public, max-age=3600';
}

/**
 * Upload a single file to S3
 */
async function uploadFile(localPath, s3Key, overrideContentType) {
  const body        = readFileSync(localPath);
  const contentType = overrideContentType || mimeLookup(localPath) || 'text/html; charset=utf-8';
  const cache       = cacheControl(localPath);

  const cmd = new PutObjectCommand({
    Bucket:       BUCKET,
    Key:          s3Key,
    Body:         body,
    ContentType:  contentType,
    CacheControl: cache,
  });

  await s3.send(cmd);
  console.log(`  ✅ ${s3Key} (${contentType})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function deploy() {
  console.log(`\n🚀 Deploying Maa Park website to S3`);
  console.log(`   Bucket : ${BUCKET}`);
  console.log(`   Region : ${REGION}`);
  console.log(`   Source : ${BASE_DIR}\n`);

  // Build the list of files to upload
  const filesToUpload = []; // [{ localPath, s3Key, contentType }]

  for (const item of INCLUDE_PATHS) {
    const fullPath = join(BASE_DIR, item);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      console.warn(`⚠️  Skipping missing path: ${item}`);
      continue;
    }

    if (stat.isDirectory()) {
      const dirFiles = collectFiles(fullPath);
      for (const f of dirFiles) {
        const s3Key = relative(BASE_DIR, f).replace(/\\/g, '/');
        filesToUpload.push({ localPath: f, s3Key });
      }
    } else {
      filesToUpload.push({ localPath: fullPath, s3Key: item });
    }
  }

  // Add clean URL aliases
  for (const alias of CLEAN_URL_ALIASES) {
    const fullPath = join(BASE_DIR, alias.localFile);
    try {
      statSync(fullPath);
      filesToUpload.push({
        localPath: fullPath,
        s3Key: alias.s3Key,
        contentType: 'text/html; charset=utf-8',
      });
    } catch {
      console.warn(`⚠️  Skipping alias for missing file: ${alias.localFile}`);
    }
  }

  console.log(`📦 Objects & Clean Route Aliases to upload: ${filesToUpload.length}\n`);

  let uploaded = 0;
  let failed = 0;

  for (const { localPath, s3Key, contentType } of filesToUpload) {
    try {
      await uploadFile(localPath, s3Key, contentType);
      uploaded++;
    } catch (err) {
      console.error(`  ❌ Failed: ${s3Key} — ${err.message}`);
      failed++;
    }
  }

  // Configure S3 Static Website Hosting with index and error fallback
  try {
    console.log(`\n⚙️  Configuring S3 Website Routing & Fallbacks...`);
    await s3.send(
      new PutBucketWebsiteCommand({
        Bucket: BUCKET,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: 'index.html' },
          ErrorDocument: { Key: 'index.html' },
        },
      })
    );
    console.log(`  ✅ Website configuration & fallback active.`);
  } catch (confErr) {
    console.warn(`  ⚠️  Website config notice:`, confErr.message);
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅ Uploaded: ${uploaded} files & route aliases`);
  if (failed > 0) console.log(`❌ Failed  : ${failed} files`);
  console.log(`\n🌐 Website URLs:`);
  console.log(`   http://${BUCKET}.s3-website.${REGION}.amazonaws.com/ambassador`);
  console.log(`   https://${BUCKET}/ambassador\n`);
}

deploy().catch(err => {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
});
