const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

const promptInput = document.getElementById('promptInput');
const styleSelect = document.getElementById('styleSelect');
const durationInput = document.getElementById('durationInput');
const generateBtn = document.getElementById('generateBtn');
const exportBtn = document.getElementById('exportBtn');
const statusText = document.getElementById('statusText');

const palettes = {
  cinematic: { bg1: '#0b1120', bg2: '#1d4ed8', bg3: '#0f172a', accent: '#f8fafc', glow: 'rgba(96, 165, 250, 0.30)', alt: '#8b5cf6' },
  neon: { bg1: '#09090b', bg2: '#7c3aed', bg3: '#22d3ee', accent: '#f0fdfa', glow: 'rgba(34, 211, 238, 0.32)', alt: '#f472b6' },
  minimal: { bg1: '#111827', bg2: '#334155', bg3: '#0f172a', accent: '#f8fafc', glow: 'rgba(255, 255, 255, 0.14)', alt: '#cbd5e1' },
  summer: { bg1: '#f97316', bg2: '#fb7185', bg3: '#facc15', accent: '#fff7ed', glow: 'rgba(255, 255, 255, 0.24)', alt: '#fff7ed' },
  luxury: { bg1: '#111827', bg2: '#7c3aed', bg3: '#B8860B', accent: '#fef3c7', glow: 'rgba(251, 191, 36, 0.26)', alt: '#f5d76b' }
};

let animationFrameId = null;
let exportFrameId = null;
let animationState = null;
let isExporting = false;

function setStatus(message) {
  statusText.textContent = message;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function stopAnimationLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function splitText(text) {
  const raw = text.trim();
  if (!raw) return ['Votre message', 'Votre vision', 'Votre impact'];

  const words = raw.replace(/\s+/g, ' ').split(' ');
  const first = words.slice(0, Math.min(4, words.length)).join(' ');
  const second = words.slice(Math.min(4, words.length), Math.min(8, words.length)).join(' ') || 'Votre vision';
  const third = words.slice(Math.min(8, words.length), Math.min(12, words.length)).join(' ') || 'Votre impact';
  return [first, second, third].filter(Boolean);
}

function getDurationValue() {
  const value = Number(durationInput.value) || 12;
  return clamp(value, 5, 30);
}

function buildScenePlan(promptText, styleKey, totalDuration) {
  const palette = palettes[styleKey] || palettes.cinematic;
  const lines = splitText(promptText);
  const introDuration = totalDuration * 0.36;
  const middleDuration = totalDuration * 0.32;
  const endDuration = totalDuration * 0.32;

  const scenes = [
    { title: lines[0], subtitle: 'Début d’une histoire visuelle', effect: 'fade', duration: introDuration, accent: palette.accent, second: palette.alt },
    { title: lines[1], subtitle: 'Lumière, énergie, mouvement', effect: 'slide', duration: middleDuration, accent: palette.alt, second: palette.accent },
    { title: lines[2], subtitle: 'Impact visuel • style moderne', effect: 'zoom', duration: endDuration, accent: palette.accent, second: palette.alt }
  ];

  return { palette, scenes };
}

function drawBackgroundForScene(palette, t) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, palette.bg1);
  gradient.addColorStop(0.5, palette.bg2);
  gradient.addColorStop(1, palette.bg3);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pulse = 0.6 + Math.sin(t * 1.25) * 0.2;
  ctx.fillStyle = palette.glow;

  ctx.beginPath();
  ctx.arc(canvas.width * 0.18, canvas.height * 0.82, canvas.width * 0.20 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(canvas.width * 0.76, canvas.height * 0.18, canvas.width * 0.24 * (1.2 - pulse), 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(scene, palette, sceneProgress, elapsed) {
  const w = canvas.width;
  const h = canvas.height;

  drawBackgroundForScene(palette, elapsed);

  const progress = clamp(sceneProgress, 0, 1);
  const ease = easeOutCubic(progress);

  ctx.save();
  ctx.translate(w / 2, h / 2);

  let x = 0;
  let y = 0;
  let scale = 1;
  let alpha = 1;

  if (scene.effect === 'fade') alpha = Math.min(1, progress * 1.3);
  if (scene.effect === 'slide') x = (1 - ease) * 230;
  if (scene.effect === 'zoom') scale = 0.75 + ease * 0.8;

  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.30)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-360, -120, 720, 240, 24);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 92px Segoe UI';
  ctx.shadowBlur = 28;
  ctx.shadowColor = scene.accent;
  ctx.fillStyle = scene.accent;
  ctx.fillText(scene.title.substring(0, 18), 0, -18);

  ctx.font = '500 30px Segoe UI';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(scene.subtitle, 0, 70);

  ctx.restore();

  const barX = 110;
  const barY = h - 70;
  const barW = w - 220;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(barX, barY, barW, 6);
  ctx.fillStyle = scene.accent;
  ctx.fillRect(barX, barY, (progress) * barW, 6);
}

function renderCurrentFrame(elapsed) {
  if (!animationState || animationState.scenes.length === 0) return;

  const totalDuration = animationState.totalDuration;
  const timeInLoop = ((elapsed % totalDuration) + totalDuration) % totalDuration;

  let cursor = 0;
  let currentScene = animationState.scenes[0];
  let progress = 0;

  for (const scene of animationState.scenes) {
    if (timeInLoop <= cursor + scene.duration) {
      currentScene = scene;
      progress = (timeInLoop - cursor) / scene.duration;
      break;
    }
    cursor += scene.duration;
  }

  drawScene(currentScene, animationState.palette, progress, elapsed);
}

function animatePreview(timestamp) {
  if (!animationState) return;

  const elapsed = (timestamp - animationState.startTime) / 1000;

  if (elapsed >= animationState.totalDuration) {
    renderCurrentFrame(animationState.totalDuration);
    setStatus('Vidéo terminée');
    animationState = null;
    stopAnimationLoop();
    return;
  }

  renderCurrentFrame(elapsed);
  animationFrameId = requestAnimationFrame(animatePreview);
}

function generatePlan() {
  const prompt = promptInput.value || 'Crée une vidéo moderne et inspirante';
  const styleKey = styleSelect.value;
  const totalDuration = getDurationValue();
  const plan = buildScenePlan(prompt, styleKey, totalDuration);

  stopAnimationLoop();
  animationState = {
    startTime: performance.now(),
    totalDuration,
    palette: plan.palette,
    scenes: plan.scenes
  };

  renderCurrentFrame(0.01);
  animationFrameId = requestAnimationFrame(animatePreview);
  setStatus('Génération en cours...');
}

function exportVideo() {
  if (isExporting) return;
  if (!animationState) generatePlan();

  isExporting = true;
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'animated-text.webm';
    link.click();
    URL.revokeObjectURL(url);
    isExporting = false;
    setStatus('Export terminé');
  };

  const totalDuration = animationState.totalDuration;
  const start = performance.now();
  recorder.start();

  function exportLoop(now) {
    const elapsed = (now - start) / 1000;
    renderCurrentFrame(elapsed);

    if (elapsed < totalDuration) {
      exportFrameId = requestAnimationFrame(exportLoop);
    } else {
      recorder.stop();
      if (exportFrameId !== null) {
        cancelAnimationFrame(exportFrameId);
        exportFrameId = null;
      }
    }
  }

  if (exportFrameId !== null) cancelAnimationFrame(exportFrameId);
  exportFrameId = requestAnimationFrame(exportLoop);
  setStatus('Export en cours...');
}

generateBtn.addEventListener('click', generatePlan);
exportBtn.addEventListener('click', exportVideo);

document.getElementById('durationInput').addEventListener('change', () => {
  const value = Number(durationInput.value);
  if (value >= 5 && value <= 30) {
    setStatus('Durée définie : ' + value + 's');
  }
});

function initialFrame() {
  const total = getDurationValue();
  const defaultPlan = buildScenePlan('Crée une vidéo moderne inspirante', styleSelect.value, total);
  animationState = {
    startTime: performance.now(),
    totalDuration: total,
    palette: defaultPlan.palette,
    scenes: defaultPlan.scenes
  };
  renderCurrentFrame(0.01);
  setStatus('Prêt');
}

initialFrame();
