# Dog Breed Recognition

A single-page web application that identifies dog breeds from uploaded images using machine learning — entirely in the browser.

Upload a photo, and the app classifies it in real time using **TensorFlow.js** and a pre-trained **MobileNet** model. No server-side processing, no API keys, no backend.

## Tech Stack

- **TensorFlow.js** — ML inference in the browser
- **MobileNet** — Pre-trained image classification model (loaded from CDN)
- **Vanilla HTML / CSS / JS** — Zero build step, no frameworks
- **Playwright** — E2E test suite (23 tests)

## Project Structure

```
dog-breed-recognition/
├── index.html             # Page structure
├── app.js                 # Upload handling + classification logic
├── style.css              # Apple-inspired responsive design
├── package.json           # Dev dependencies (Playwright, serve)
├── playwright.config.ts   # Test configuration
├── cloud-init/
│   ├── user-data-caddy.yaml    # Cloud-init config for Caddy VM
│   └── provision-multipass.sh  # One-command VM launcher
└── test/
    ├── helpers.ts          # CDN mocks, test fixtures, instrumentation
    ├── structure.spec.ts   # 10 page structure tests
    ├── file-upload.spec.ts # 5 upload interaction tests
    ├── classification.spec.ts # 4 real CDN integration tests
    └── bugs.spec.ts        # 4 regression tests
```

## Quick Start

No build step required. Open `index.html` directly in a browser:

```bash
# Option 1: open the file directly
xdg-open index.html        # Linux
open index.html             # macOS

# Option 2: serve locally (requires Node.js)
npm install
npm run serve
# → http://localhost:3333
```

## Deploy

This is a static site — any static hosting works.

### GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Pages → Source** → select the branch (e.g. `main`) and root `/`.
3. The site is live at `https://<user>.github.io/dog-breed-recognition/`.

### Nginx / Apache

Copy `index.html`, `app.js`, and `style.css` to your web root:

```bash
cp index.html app.js style.css /var/www/html/dog-breed-recognition/
```

### Any Static Host (Netlify, Vercel, Cloudflare Pages)

Point the deploy to the repo root. No build command needed — the entry point is `index.html`.

### Caddy on a Multipass VM (cloud-init)

The `cloud-init/` directory contains everything needed to deploy the app on a fresh Ubuntu 24.04 VM behind the [Caddy](https://caddyserver.com/) web server, using [Multipass](https://multipass.run/).

**Prerequisites**: [Multipass](https://multipass.run/install) installed on your host machine.

**One-command deploy**:

```bash
./cloud-init/provision-multipass.sh
```

This will:

1. Launch an Ubuntu 24.04 VM (`dog-breed`) with 2 CPU / 2 GB RAM / 10 GB disk.
2. Install Caddy from the official apt repository.
3. `git clone` the app from GitHub into `/var/www/dog-breed`.
4. Configure Caddy to serve the app on port 80.
5. Run a health check with retry to confirm the app is reachable.
6. Print the VM's IP address — open `http://<VM_IP>/` in your browser.

**What to expect**:

- Provisioning takes ~2–3 minutes (package updates + Caddy install + git clone).
- The script verifies deployment automatically (sentinel file + HTTP check).
- If Caddy is still starting, the script prints a warning with a manual check command.
- The app works identically to the local version — upload a dog photo and get a breed prediction.

**Manual launch** (without the provisioner script):

```bash
multipass launch 24.04 --name dog-breed \
  --cloud-init cloud-init/user-data-caddy.yaml \
  --cpus 2 --memory 2G --disk 10G
```

**Cleanup**:

```bash
multipass delete dog-breed --purge
```

## Run Tests

```bash
npm install
npx playwright install --with-deps chromium
npm test
```

The test suite covers page structure, file uploads, real model classification (requires network), and regression tests for previously fixed bugs.

## Author

chrystel.nintcheu@polymtl.ca
