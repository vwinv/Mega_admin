/**
 * Rend les pixels quasi-blancs transparents pour superposer
 * une signature / image sur le texte du document.
 */
export async function makeSignatureBackgroundTransparent(
  dataUrl: string,
  threshold = 248
): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Blanc / quasi-blanc → transparent
          if (r >= threshold && g >= threshold && b >= threshold) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const STAMP_BLUE = "#3B6CB5";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image signature illisible"));
    img.src = src;
  });
}

/** Format Adobe-like : Jul 23, 2026 21:15:56 GMT */
export function formatSignatureGmt(date = new Date()): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const d = new Date(date);
  const mon = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${mon} ${day}, ${year} ${hh}:${mm}:${ss} GMT`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Tampon style Adobe Sign :
 *  - signature / initiales manuscrites
 *  - trait bleu
 *  - légende bleue (nom + horodatage, ou initiales)
 */
export async function composeSignatureReturnStamp(input: {
  signatureImage: string;
  label: string;
  variant?: "signature" | "initiales";
  signedAt?: Date;
}): Promise<string> {
  const variant = input.variant ?? "signature";
  const label = input.label.trim() || "Signataire";
  const caption =
    variant === "initiales"
      ? label
      : `${label} (${formatSignatureGmt(input.signedAt)})`;

  const raw = input.signatureImage.startsWith("data:image/")
    ? await makeSignatureBackgroundTransparent(input.signatureImage)
    : input.signatureImage;
  const img = await loadImage(raw);

  const maxSigW = variant === "initiales" ? 140 : 340;
  const maxSigH = variant === "initiales" ? 72 : 88;
  const scale = Math.min(maxSigW / img.width, maxSigH / img.height, 1);
  const sigW = Math.max(1, Math.round(img.width * scale));
  const sigH = Math.max(1, Math.round(img.height * scale));

  const padX = 10;
  const padTop = 4;
  const gap = 5;
  const lineThick = 2;
  const captionSize = variant === "initiales" ? 13 : 11;
  const captionH = Math.ceil(captionSize * 1.35);

  const measure = document.createElement("canvas").getContext("2d");
  let captionW = 0;
  if (measure) {
    measure.font = `500 ${captionSize}px Arial, Helvetica, sans-serif`;
    captionW = measure.measureText(caption).width;
  } else {
    captionW = caption.length * captionSize * 0.55;
  }

  const contentW = Math.max(sigW, Math.ceil(captionW));
  const width = contentW + padX * 2;
  const height = padTop + sigH + gap + lineThick + gap + captionH + 6;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Signature manuscrite (centré à gauche)
  const sigX = padX;
  const sigY = padTop;
  ctx.drawImage(img, sigX, sigY, sigW, sigH);

  // Trait bleu
  const lineY = padTop + sigH + gap;
  ctx.strokeStyle = STAMP_BLUE;
  ctx.lineWidth = lineThick;
  ctx.beginPath();
  ctx.moveTo(padX, lineY + lineThick / 2);
  ctx.lineTo(padX + contentW, lineY + lineThick / 2);
  ctx.stroke();

  // Légende bleue
  ctx.fillStyle = STAMP_BLUE;
  ctx.font = `500 ${captionSize}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(caption, padX, lineY + lineThick + gap);

  return canvas.toDataURL("image/png");
}
