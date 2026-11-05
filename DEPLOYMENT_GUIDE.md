# MaaPark.in Production Deployment & Live Verification Guide

This guide provides the step-by-step procedure to deploy the audited and secured platform code from your local machine to the live server (`https://maapark.in`) without service interruption or data loss.

---

## 1. Pre-Deployment Data Backup Checklist

Before pushing any changes to production, back up your live databases:

### A. Local / EC2 SQLite Backup
```bash
# On your server / working directory:
cp maa_park.sqlite maa_park_backup_$(date +%F_%H%M%S).sqlite
```

### B. MongoDB Atlas Cloud Backup
1. Log into your [MongoDB Atlas Console](https://cloud.mongodb.com).
2. Go to **Database Deployments** &rarr; **Cluster0** &rarr; **Backup**.
3. Create an on-demand snapshot or run mongodump:
   ```bash
   mongodump --uri="YOUR_MONGODB_URI" --out="./backup_mongo_$(date +%F)"
   ```

---

## 2. Summary of Audited & Verified Platform Changes

| Area | Key Updates Made |
|------|------------------|
| **Exam Submission Flow** | • Concealed all instant marks, scores, and certificate downloads from candidate view.<br>• Clean confirmation displayed: *"Exam Submitted Successfully! Your results and certificate will be verified and made available later."*<br>• Status automatically marked as `'Submitted - Pending Review'` in MongoDB and SQLite. |
| **Certificate Gatekeeping** | • Direct download (`/certificate/download/:id`) returns **HTTP 403 Forbidden** while in pending review.<br>• Verification page (`championship-verify.html`) renders an amber **Under Verification** card without exposing marks or certificates until admin release.<br>• Admin endpoint (`POST /api/championship/admin/release-results`) provided to batch release certificates. |
| **Authentication & Security** | • **Removed client-side bypass**: Discarded unverified `MPC-2026-` arbitrary fallback.<br>• Strict payment check enforced: Only candidates with verified fee payments can access the exam.<br>• Attempt lockouts: Completed or submitted candidates cannot re-enter. |
| **Navigation & Scrolling** | • Fixed smooth scrolling querySelector bug on `href="#"` anchors that threw DOMExceptions.<br>• Replaced all empty hash links with proper routes or non-jumping anchors.<br>• Added `{ behavior: 'smooth' }` to all in-page jump triggers. |

---

## 3. Step-by-Step Live Deployment

### Step A: Deploy Frontend Assets to S3 / CloudFront
Run the automated S3 deployment script from your project directory:

```bash
npm run deploy
```
*This uploads `index.html`, `style.css`, `script.js`, `championship.html`, `championship-exam.html`, `championship-verify.html`, `quiz.html`, and `growth-loop-widget.js` to S3.*

If using CloudFront CDN, invalidate cache so users immediately receive the new code:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

---

### Step B: Deploy Backend to EC2 Server
1. **SSH into your EC2 server**:
   ```bash
   ssh -i your-key.pem ubuntu@ec2-your-ip.compute.amazonaws.com
   ```
2. **Navigate to the app directory**:
   ```bash
   cd /path/to/maa-park
   ```
3. **Pull or sync the updated files**:
   - `backend.js`
   - `championship-routes.js`
   - `championship-services.js`
   - `database.js`
   - `database_sql.js`
   - `growth-loop-routes.js`
   - `package.json`
4. **Install dependencies (if updated)**:
   ```bash
   npm install --production
   ```
5. **Restart the backend service with PM2**:
   ```bash
   pm2 restart backend
   # Or:
   pm2 restart all
   ```
6. **Verify server health**:
   ```bash
   curl -I http://localhost:3000/health
   # Expected: HTTP/1.1 200 OK
   ```

---

## 4. Post-Deployment Verification Checklist

Verify the following live URLs in your browser (use Incognito window):

- [ ] **Home Page**: [https://maapark.in](https://maapark.in)
  - Verify logo click reloads cleanly without `#` in URL.
  - Test navigation links (Mission, Features, Pricing) for smooth scrolling.
- [ ] **Championship Portal**: [https://maapark.in/championship.html](https://maapark.in/championship.html)
  - Click "Register Now" — page scrolls smoothly to the registration section without jumping.
  - Verify countdown and seat ticker widgets load properly.
- [ ] **Exam Room**: [https://maapark.in/championship-exam.html](https://maapark.in/championship-exam.html)
  - Test fake roll number login (e.g. `MPC-2026-FAKE-1234`): Must be rejected with *"Roll number not found or payment unverified."*
  - Test **"1-Click Practice Exam"**: Loads demo candidate safely, answers submit, and post-submission screen displays **"Exam Submitted Successfully! Your results and certificate will be verified and made available later."**
  - Verify that **NO numerical score, percentage, or certificate download button** appears.
- [ ] **Certificate Verification**: [https://maapark.in/championship-verify.html](https://maapark.in/championship-verify.html)
  - Check roll number lookup: Displays *"Results Not Declared Yet"*.

---

## 5. Admin Certificate Release Procedure

When you are ready to evaluate and release official scorecards and certificates to students:

Send an authenticated HTTP POST request to your backend:

```bash
# Release ALL candidates whose status is 'Submitted - Pending Review':
curl -X POST https://api.maapark.in/api/championship/admin/release-results \
  -H "Content-Type: application/json" \
  -H "x-admin-token: maapark_admin_secure_2026" \
  -d '{"releaseAll": true}'

# Or release specific roll numbers:
curl -X POST https://api.maapark.in/api/championship/admin/release-results \
  -H "Content-Type: application/json" \
  -H "x-admin-token: maapark_admin_secure_2026" \
  -d '{"rollNumbers": ["MPC-2026-RCN-4812", "MPC-2026-DNI-2045"]}'
```

Once released, candidates will immediately be able to verify their certificate and download official PDFs on [https://maapark.in/championship-verify.html](https://maapark.in/championship-verify.html).
