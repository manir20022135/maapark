// script.js
// Maa Park Frontend JavaScript
// Form submissions now use fetch() to call the Express/MongoDB backend API
// Replace BACKEND_URL below with your actual AWS EC2 public URL after deployment

// ─── Configuration ────────────────────────────────────────────────────────────
// Change this to your EC2 instance's public URL, e.g.:
//   'http://ec2-XX-XX-XX-XX.ap-south-1.compute.amazonaws.com:3000'
// Or if you've set up a domain/CloudFront:
const BACKEND_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '3000' || window.location.hostname.endsWith('onrender.com'))
    ? ''
    : (window.location.origin.includes('maapark.in') ? '' : 'https://maapark.onrender.com');

// ─── DOM Ready ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

    // ─── Scroll Animations ─────────────────────────────────────────────────

    // Mark JS as active — CSS will now enable animations
    document.documentElement.classList.add('js-ready');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -30px 0px',
        threshold: 0.05
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe ONLY individual animated elements — NOT whole sections
    const elementsToAnimate = document.querySelectorAll('.animate-up, .animate-fade-in');
    elementsToAnimate.forEach(el => observer.observe(el));

    // Safety fallback: force show any still-hidden elements after 1.5s
    setTimeout(() => {
        document.querySelectorAll('.animate-up, .animate-fade-in').forEach(el => {
            el.classList.add('in-view');
        });
    }, 1500);

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || href === '#!') {
                e.preventDefault();
                return;
            }
            if (href === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            try {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } catch (err) {
                // Fallback / ignore invalid selector
            }
        });
    });




    // ─── Collaboration Form → MongoDB Backend ─────────────────────────────

    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button');
            const originalText = btn.textContent;

            const name    = document.getElementById('name').value.trim();
            const email   = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            // Simple client-side validation
            if (!name || !email || !message) {
                alert('Please fill in all fields before submitting.');
                return;
            }

            // Show loading state
            btn.textContent = 'Sending...';
            btn.style.opacity = '0.7';
            btn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/api/collaborate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, message }),
                });

                const result = await response.json();

                if (!response.ok) {
                    // Server returned an error (4xx or 5xx)
                    throw new Error(result.error || `Server error: ${response.status}`);
                }

                // ✅ Success
                btn.textContent = '✓ Message Sent!';
                btn.style.backgroundColor = '#0c6b58';
                btn.style.color = '#fff';
                form.reset();

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }, 4000);

            } catch (error) {
                console.error('Form submission error:', error);

                // Show friendly error message
                btn.textContent = error.message.includes('fetch')
                    ? '❌ Cannot reach server'
                    : '❌ Error — Try Again';
                btn.style.backgroundColor = '#c0392b';
                btn.style.color = '#fff';
                btn.style.opacity = '1';
                btn.disabled = false;

                // Reset error state after 5 seconds
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 5000);
            }
        });
    }



    // ─── 3D Particle Constellation / Wave System ──────────────────────────
    (function init3DHero() {
        const canvas = document.getElementById('hero-3d-canvas');
        if (!canvas) return;

        // Check if Three.js is loaded
        if (typeof THREE !== 'undefined') {
            try {
                const container = document.getElementById('three-canvas-container');
                let width = container.clientWidth;
                let height = container.clientHeight;

                // Scene, Camera, Renderer
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                camera.position.z = 12;

                const renderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    alpha: true,
                    antialias: true
                });
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                // Particles
                const particleCount = 450;
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);

                // Sky Blue (#38bdf8) and Emerald Green (#10b981) color options
                const colorPalette = [
                    new THREE.Color(0x38bdf8), // Sky blue
                    new THREE.Color(0x10b981), // Emerald
                    new THREE.Color(0x0ea5e9)  /* Accent */
                ];

                for (let i = 0; i < particleCount * 3; i += 3) {
                    // Spherical distribution
                    const u = Math.random();
                    const v = Math.random();
                    const theta = u * 2.0 * Math.PI;
                    const phi = Math.acos(2.0 * v - 1.0);
                    const r = 4.5 + Math.random() * 2.5; // radius

                    positions[i] = r * Math.sin(phi) * Math.cos(theta);
                    positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
                    positions[i + 2] = r * Math.cos(phi);

                    // Random color from palette
                    const chosenColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                    colors[i] = chosenColor.r;
                    colors[i + 1] = chosenColor.g;
                    colors[i + 2] = chosenColor.b;
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                // Texture helper for clean circular particles
                const createCircleTexture = () => {
                    const canvasMat = document.createElement('canvas');
                    canvasMat.width = 16;
                    canvasMat.height = 16;
                    const ctx = canvasMat.getContext('2d');
                    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
                    grad.addColorStop(0, 'rgba(255,255,255,1)');
                    grad.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(8, 8, 8, 0, Math.PI * 2);
                    ctx.fill();
                    return new THREE.CanvasTexture(canvasMat);
                };

                const material = new THREE.PointsMaterial({
                    size: 0.15,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.85,
                    map: createCircleTexture(),
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });

                const particleSystem = new THREE.Points(geometry, material);
                scene.add(particleSystem);

                // Mouse interaction parallax
                let mouseX = 0;
                let mouseY = 0;
                let targetX = 0;
                let targetY = 0;

                window.addEventListener('mousemove', (e) => {
                    mouseX = (e.clientX - window.innerWidth / 2);
                    mouseY = (e.clientY - window.innerHeight / 2);
                });

                // Resize handler
                window.addEventListener('resize', () => {
                    width = container.clientWidth;
                    height = container.clientHeight;
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                });

                // Animation loop
                const animate = () => {
                    requestAnimationFrame(animate);

                    particleSystem.rotation.y += 0.0012;
                    particleSystem.rotation.x += 0.0006;

                    // Parallax shift
                    targetX = mouseX * 0.006;
                    targetY = mouseY * 0.006;

                    camera.position.x += (targetX - camera.position.x) * 0.04;
                    camera.position.y += (-targetY - camera.position.y) * 0.04;
                    camera.lookAt(scene.position);

                    renderer.render(scene, camera);
                };
                animate();
                return;
            } catch (err) {
                console.error("Three.js setup failed, launching 2D fallback", err);
            }
        }

        // ─── 2D Canvas Fallback (if CDN is slow/fails) ────────────────────
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const particles = [];
        const colors = ['rgba(56,189,248,0.3)', 'rgba(16,185,129,0.3)', 'rgba(14,165,233,0.3)'];

        for (let i = 0; i < 45; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 4 + 2,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        window.addEventListener('resize', () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        });

        function draw2D() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;
            });
            requestAnimationFrame(draw2D);
        }
        draw2D();
    })();

});
