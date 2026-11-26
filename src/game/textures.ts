import * as THREE from 'three';

export type ProceduralTextureKind =
  | 'sand'
  | 'grass'
  | 'marble'
  | 'cobble'
  | 'bark'
  | 'leaves';

export function createProceduralTexture(
  type: ProceduralTextureKind,
  maxAnisotropy = 4,
  isColorMap = true
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (type === 'sand') {
    ctx.fillStyle = '#e7c98b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle =
        Math.random() > 0.5
          ? 'rgba(210,170,105,0.45)'
          : 'rgba(255,244,214,0.45)';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(194,150,86,0.25)';
    ctx.lineWidth = 3;
    for (let y = 16; y < 256; y += 32) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.05) * 4);
      }
      ctx.stroke();
    }
  } else if (type === 'grass') {
    ctx.fillStyle = '#3f8f46';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.45 ? '#2f7336' : '#5cb356';
      ctx.fillRect(x, y, 2, 5);
    }
  } else if (type === 'marble') {
    ctx.fillStyle = '#f8f5ec';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(217, 179, 108, 0.48)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.strokeRect(132, 4, 120, 120);
    ctx.strokeRect(4, 132, 120, 120);
    ctx.strokeRect(132, 132, 120, 120);
    ctx.strokeStyle = 'rgba(180, 165, 140, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      let px = Math.random() * 256;
      let py = Math.random() * 256;
      ctx.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        px += (Math.random() - 0.5) * 50;
        py += (Math.random() - 0.5) * 50;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (type === 'cobble') {
    ctx.fillStyle = '#948979';
    ctx.fillRect(0, 0, 256, 256);
    const colors = ['#b5aa99', '#a39786', '#c7bdb0', '#8d8171'];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const bx = (col * 32 + (row % 2 === 0 ? 2 : 10)) % 236;
        const by = row * 32 + 3;
        ctx.fillStyle = colors[(row + col) % colors.length];
        ctx.fillRect(bx, by, 26, 25);
        ctx.strokeStyle = 'rgba(60, 50, 40, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, 26, 25);
      }
    }
  } else if (type === 'bark') {
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * 256;
      ctx.fillStyle = i % 2 === 0 ? '#3e2412' : '#744b2c';
      ctx.fillRect(x, 0, 2 + Math.random() * 4, 256);
    }
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = 'rgba(30, 16, 8, 0.35)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 12);
    }
  } else if (type === 'leaves') {
    ctx.fillStyle = '#2d7a36';
    ctx.fillRect(0, 0, 256, 256);
    const greens = ['#1f5e27', '#2f853a', '#44a349', '#63bf56'];
    for (let i = 0; i < 950; i++) {
      ctx.fillStyle = greens[i % greens.length];
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 256,
        Math.random() * 256,
        4 + Math.random() * 6,
        2.5 + Math.random() * 4,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(maxAnisotropy, 8);
  if (isColorMap) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
}

export function createSkyGradientTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#1e3a8a');
  grad.addColorStop(0.38, '#3b82f6');
  grad.addColorStop(0.68, '#93c5fd');
  grad.addColorStop(1.0, '#fef3c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.24)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFloatingTextSprite(
  text: string,
  bgColor = 'rgba(15, 23, 42, 0.88)',
  textColor = '#fde047'
): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 104;
  const ctx = c.getContext('2d')!;

  // Rounded badge card
  const r = 18;
  const x = 10;
  const y = 10;
  const w = 400;
  const h = 84;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 34px Cairo, Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 210, 54);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.9, 0.72, 1);
  return sprite;
}
