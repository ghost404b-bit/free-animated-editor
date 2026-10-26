const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

const promptInput = document.getElementById('promptInput');
const styleSelect = document.getElementById('styleSelect');
const durationInput = document.getElementById('durationInput');
const generateBtn = document.getElementById('generateBtn');
const exportBtn = document.getElementById('exportBtn');
const statusText = document.getElementById('statusText');

const stylePalettes = {
  cinematic: {
    background: ['#0f172a', '#1d4ed8', '#111827'],
    accent: '#f8fafc',
    glow: 'rgba(59, 130, 246, 0.3)',
    secondary: '#8b5cf6'
  },
  neon: {
    background: ['#09090b', '#7c3aed', '#22d3ee'],
    accent: '#f0fdfa',
    glow: 'rgba(34, 211, 238, 0.35)',
    secondary: '#f472b6'
  },
  minimal: {
    background: ['#111827', '#334155', '#0f172a'],
    accent: '#f8fafc',
    glow: 'rgba(255,255,255,0.16)',
    secondary: '#cbd5e1'
  },
  summer: {
    background: ['#f97316', '#fb7185', '#facc15'],
    accent: '#fff7ed',
    glow: 'rgba(255,255,255,0.2)',
    secondary: '#fff7ed'
  },
  luxury: {
    background: ['#111827', '#B8860B', '#312e81'],
    accent: '#fef3c7',
    glow: 'rgba(251, 191, 36, 0.25)',
    secondary: '#f5d76b'
  }
};

let scenePlan = [];
let animationStart = 0;
let isExporting = false;

function splitText(text) {
  const raw = text.trim();
  if (!raw) return ['Votre message', 'Votre vision', 'Votre histoire'];

  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/\s+(?=\b|$)/);
  const words = cleaned.split(' ');

  const first = words.slice(0, Math.min(4, words.length)).join(' ');
  const second = words.slice(Math.min(4, words.length), Math.min(8, words.length)).join(' ') || 'Rêve ton style';
  const third = words.slice(Math.min(8, words.length), Math.min(12, words.length)).join(' ') || 'Crée ton impact';

  const list = [first, second, third].filter(Boolean).map((part) => part.trim());
  return list.length ? list : ['Votre message', 'Votre style', 'Votre impact'];
}

function buildScenePlan(promptText, styleKey) {
  const palette = stylePalettes[styleKey] || stylePalettes.cinematic;
  const lines = splitText(promptText);
  const baseTitle = lines[0];
  const subtitle = lines[1] || 'Vidéo animée';
  const cta = lines[2] || 'Créez votre story';

  const scenes = [
    {
      label: 'intro',
      title: baseTitle,
      subtitle: 'Début d’une histoire visuelle',
      accent: palette.accent,
      color: palette.secondary,
      duration: 4,
      effect: 'fade'
    },
    {
      label: 'focus',
      title: subtitle,
      subtitle: 'Lumière, énergie, mouvement',
      accent: palette.secondary,
      color: palette.accent,
      duration: 3.5,
      effect: 'slide'
    },
    {
      label: 'cta',
      title: cta,
      subtitle: 'Impact visuel • animation • style moderne',
      accent: palette.accent,
      color: palette.secondary,
      duration: 4.5,
      effect: 'zoom'
    }
  ];

  return { palette, scenes };
}

function setStatus(message) {
  statusText.textContent = message;
}

function drawBackgroundForScene(palette, t) {
  const colors = palette.background;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pulse = 0.5 + Math.sin(t * 1.2) * 0.18;
  ctx.fillStyle = palette.glow;
  ctx.beginPath();
  ctx.arc(canvas.width * 0.75, canvas.height * 0.2, canvas.width * 0.22 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(canvas.width * 0.2, canvas.height * 0.8, canvas.width * 0.18 * (1.3 - pulse), 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(scene, palette, sceneProgress, totalElapsed) {
  const w = canvas.width;
  const h = canvas.height;

  drawBackgroundForScene(palette, totalElapsed);

  const finished = Math.min(Math.max(sceneProgress, 0), 1);
  const ease = 1 - Math.pow(1 - finished, 3);

  ctx.save();
  ctx.translate(w / 2, h / 2);

  let x = 0;
  let y = 0;
  let scale = 1;
  let alpha = 1;

  if (scene.effect === 'fade') {
    alpha = Math.min(1, finished * 1.3);
  }

  if (scene.effect === 'slide') {
    x = (1 - ease) * 220;
  }

  if (scene.effect === 'zoom') {
    scale = 0.72 + ease * 0.8;
  }

  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.font = '800 120px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = scene.accent;
  ctx.shadowBlur = 28;
  ctx.shadowColor = scene.color;
  ctx.fillText(scene.title.substring(0, 24), 0, -20);

  ctx.font = '500 34px Segoe UI';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(scene.subtitle, 0, 80);

  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(80, h - 70, w - 160, 8);
  ctx.fillStyle = scene.accent;
  const progressWidth = ((totalElapsed % 8) / 8) * (w - 160);
  ctx.fillRect(80, h - 70, progressWidth, 8);
}

function renderAnimation(timestamp) {
  if (!scenePlan.length) {
    requestAnimationFrame(renderAnimation);
    return;
  }

  const totalDuration = scenePlan.reduce((sum, part) => sum + part.duration, 0);
  const elapsed = (timestamp - animationStart) / 1000;

  let cursor = 0;
  let sceneIndex = 0;

  for (let i = 0; i < scenePlan.length; i++) {
    const scene = scenePlan[i];
    const sceneStart = cursor;
    const sceneEnd = cursor + scene.duration;

    if (elapsed >= sceneStart && elapsed <= sceneEnd) {
      const progress = (elapsed - sceneStart) / scene.duration;
      drawScene(scene, scenePlan[0].palette, progress, elapsed);
      break;
    }

    cursor = sceneEnd;
    sceneIndex = i;
  }

  if (elapsed >= totalDuration) {
    animationStart = timestamp;
  }

  requestAnimationFrame(renderAnimation);
}

function generatePlan() {
  const prompt = promptInput.value || 'Crée une vidéo forte et moderne';
  const styleKey = styleSelect.value;
  const plan = buildScenePlan(prompt, styleKey);
  scenePlan = plan.scenes.map((scene) => ({ ...scene, palette: plan.palette }));
  animationStart = performance.now();
  renderAnimation(animationStart);
  setStatus('Vidéo générée : ' + styleKey);
}

function exportVideo() {
  if (!scenePlan.length) {
    generatePlan();
  }

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
    link.download = 'text-to-video.webm';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Export terminé');
  };

  const plan = scenePlan;
  const totalDuration = plan.reduce((sum, scene) => sum + scene.duration, 0);
  const start = performance.now();
  recorder.start();

  function exportFrame(timeNow) {
    const elapsed = (timeNow - start) / 1000;

    let cursor = 0;
    for (const scene of plan) {
      const sceneStart = cursor;
      const sceneEnd = cursor + scene.duration;
      if (elapsed >= sceneStart && elapsed <= sceneEnd) {
        const progress = (elapsed - sceneStart) / scene.duration;
        drawScene(scene, plan[0].palette, progress, elapsed);
        break;
      }
      cursor = sceneEnd;
    }

    if (elapsed < totalDuration) {
      requestAnimationFrame(exportFrame);
    } else {
      recorder.stop();
    }
  }

  setStatus('Export en cours...');
  requestAnimationFrame(exportFrame);
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
  const base = buildScenePlan('Crée une vidéo moderne inspirante', styleSelect.value);
  scenePlan = base.scenes.map((scene) => ({ ...scene, palette: base.palette }));
  drawScene(scenePlan[0], base.palette, 1, 0.5);
  setStatus('Prêt');
}

initialFrame();
