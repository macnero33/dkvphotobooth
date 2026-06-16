# dkvphotobooth

Snap & Go — simple photobooth app (local dev).

Quick start

```bash
cd ~/Downloads/dkvphotobooth
npm install
npm run dev
# open http://localhost:5174/ (or the port printed by the dev server)
```

Notes
- Allow camera access in your browser (Site settings or macOS System Settings).
- If camera is unavailable, the app falls back to upload or generated previews.

Repository: https://github.com/macnero33/dkvphotobooth
# Snap & Go Photobooth

A modern web-based photobooth application built with React Router, XState, and Cloudinary.

## Features

- 📸 **3-Photo Capture Sequence** - Takes 3 photos with countdown timer
- 🎨 **Instant Photo Strip** - Stitches photos into a branded vertical strip (1080x1920)
- 📱 **QR Code Retrieval** - Generate QR codes for mobile download
- 🔊 **Audio Feedback** - Countdown beeps and shutter sounds
- 🎥 **Live Camera Preview** - Mirrored webcam preview during capture
- ☁️ **Cloudinary Integration** - Unsigned uploads for serverless architecture
- ♻️ **Auto-Reset** - Returns to idle after 60 seconds
- 🔄 **Error Recovery** - Retry logic for failed uploads

## Tech Stack

- **React Router 7** - File-based routing with SSR
- **XState v5** - Finite state machine for booth flow
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **react-webcam** - Camera integration
- **Canvas API** - Client-side image stitching
- **Cloudinary** - Image hosting and delivery
- **ts-pattern** - Pattern matching for state rendering

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Cloudinary

Copy the environment template:

```bash
cp .env.template .env
```

Edit `.env` with your Cloudinary credentials:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

**Create an unsigned upload preset:**
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Settings → Upload → Upload presets
3. Add upload preset → Set "Signing Mode" to "Unsigned"
4. Copy the preset name to your `.env` file

### 3. Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:5173` and allow camera permissions when prompted.

## Project Structure

```
app/
├── machines/
│   └── boothMachine.ts           # XState FSM (7 states)
├── lib/
│   ├── canvas-stitcher.ts        # Image processing
│   ├── cloudinary-upload.ts      # Upload service
│   ├── audio-utils.ts            # Audio generation
│   └── utils.ts                  # Utilities
├── components/
│   ├── booth/
│   │   ├── BoothContainer.tsx    # Main controller
│   │   └── views/                # State-specific views
│   │       ├── IdleView.tsx
│   │       ├── CountdownView.tsx
│   │       ├── CaptureView.tsx
│   │       ├── ProcessingView.tsx
│   │       ├── SuccessView.tsx
│   │       └── FailureView.tsx
│   └── ui/
│       └── button.tsx            # shadcn/ui button
└── routes/
    ├── _index.tsx                # Kiosk route (/)
    └── photo.$id.tsx             # Retrieval route (/photo/:id)

public/
└── assets/
    └── frame.svg                 # Photo strip overlay

scripts/
└── generate-frame.js             # Frame generation utility
```

## How It Works

### State Machine Flow

1. **idle** - Start screen with camera permission request
2. **countdown** - 3-2-1 countdown with live preview
3. **capture** - Take photo with flash animation
4. **checkProgress** - Check if 3 photos captured
5. **stitching** - Combine photos with frame overlay
6. **uploading** - Upload to Cloudinary (3 retry attempts)
7. **success** - Display photos + QR code
8. **failure** - Error handling with retry option

### Image Processing

- Captures 3 photos as base64 data URLs
- Center-crops photos to maintain aspect ratio
- Stitches into 1080×1920px portrait strip
- Overlays SVG frame with white borders
- Exports as JPEG (90% quality)

### Audio Generation

- Generates sounds programmatically via Web Audio API
- No external audio files required
- 440Hz sine wave for countdown beeps
- Percussive click for shutter sound

## Customization

### Frame Design

Edit `public/assets/frame.svg` or regenerate:

```bash
node scripts/generate-frame.js
```

Current frame includes:
- 20px white border
- Top branding area (80px)
- Bottom branding area (80px)

### Auto-Reset Timeout

Modify timeout in `app/components/booth/views/SuccessView.tsx`:

```typescript
// Default: 60 seconds
<p>This session will auto-reset in 60 seconds</p>
```

### Upload Retry Logic

Adjust in `app/machines/boothMachine.ts`:

```typescript
uploadRetries: number; // Max 3 retries
```

## Building for Production

Create production build:

```bash
pnpm build
```

Output:
```
build/
├── client/    # Static assets
└── server/    # Server-side code
```

## Deployment

### Docker

```bash
docker build -t snap-and-go .
docker run -p 3000:3000 snap-and-go
```

### Platforms

Compatible with:
- Vercel
- Netlify
- AWS ECS
- Google Cloud Run
- Fly.io
- Railway
- Digital Ocean

**Note:** Ensure environment variables are configured in your deployment platform.

## Routes

- **`/`** - Main kiosk interface (desktop-optimized)
- **`/photo/:publicId`** - Mobile retrieval page with download button

## Technical Highlights

- **No backend required** - Uses Cloudinary unsigned uploads
- **Client-side processing** - All image stitching done in browser
- **Pattern matching** - Clean state rendering with ts-pattern
- **Type-safe** - Full TypeScript coverage
- **Responsive** - Desktop kiosk + mobile retrieval views
- **Privacy-first** - No PII storage, images auto-delete (configure in Cloudinary)

## Troubleshooting

### Camera not working
- Ensure HTTPS in production (required for camera access)
- Check browser permissions
- Test on localhost first

### Upload failures
- Verify Cloudinary credentials in `.env`
- Ensure upload preset is "Unsigned"
- Check network connectivity

### Photos not stitching
- Ensure `frame.svg` exists in `public/assets/`
- Check console for errors
- Verify all 3 photos were captured

## Documentation

- [Setup Guide](./SETUP.md) - Detailed configuration
- [PRD](./docs/PRD.md) - Product requirements
- [TRD](./docs/TRD.md) - Technical requirements

---

Built with ❤️ using React Router, XState, and Cloudinary.
