import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type StampAnnotation = {
  type: string;
  valeur: string | null;
  posX: number;
  posY: number;
  largeur: number;
  hauteur: number;
  page?: number;
};

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const bin = Buffer.from(m[2], "base64");
  return { bytes: new Uint8Array(bin), mime };
}

/**
 * Produit un PDF avec les annotations (signatures, texte…) incrustées.
 * Fonctionne pour un PDF source ou une image (PNG/JPEG/WebP→PNG via bytes).
 */
export async function buildSignedPdf(input: {
  fileBytes: Uint8Array;
  fileMime: string;
  fileName: string;
  annotations: StampAnnotation[];
}): Promise<{ bytes: Uint8Array; fileName: string }> {
  const mime = (input.fileMime || "").toLowerCase();
  const isPdf =
    mime.includes("pdf") || input.fileName.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/");

  let pdf: PDFDocument;

  if (isPdf) {
    pdf = await PDFDocument.load(input.fileBytes, {
      ignoreEncryption: true,
    });
  } else if (isImage) {
    pdf = await PDFDocument.create();
    let embedded;
    if (mime.includes("png")) {
      embedded = await pdf.embedPng(input.fileBytes);
    } else if (mime.includes("jpeg") || mime.includes("jpg")) {
      embedded = await pdf.embedJpg(input.fileBytes);
    } else {
      // webp / autres : encapsuler en page A4 avec note — tenter PNG
      try {
        embedded = await pdf.embedPng(input.fileBytes);
      } catch {
        const page = pdf.addPage([595, 842]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        page.drawText("Aperçu image non convertible — ouvrez le fichier original.", {
          x: 40,
          y: 800,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        const out = await pdf.save();
        return {
          bytes: out,
          fileName: signedFileName(input.fileName),
        };
      }
    }
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  } else {
    pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText(`Document : ${input.fileName}`, {
      x: 40,
      y: 800,
      size: 12,
      font,
    });
    page.drawText(
      "Format non prévisualisable en PDF signé. Les annotations sont listées dans Mega Signature.",
      { x: 40, y: 780, size: 10, font, color: rgb(0.3, 0.3, 0.3) }
    );
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  for (const a of input.annotations) {
    const pageIndex = Math.max(0, Math.min((a.page ?? 1) - 1, pages.length - 1));
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    const w = Math.max(a.largeur, 0.02) * width;
    const h = Math.max(a.hauteur, 0.02) * height;
    const x = a.posX * width;
    // PDF origin = bottom-left ; UI origin = top-left
    const y = height - a.posY * height - h;

    const valeur = a.valeur?.trim() ?? "";
    if (valeur.startsWith("data:image/")) {
      const parsed = dataUrlToBytes(valeur);
      if (!parsed) continue;
      try {
        const img = parsed.mime.includes("png")
          ? await pdf.embedPng(parsed.bytes)
          : await pdf.embedJpg(parsed.bytes);
        page.drawImage(img, { x, y, width: w, height: h });
      } catch {
        // ignore invalid stamp image
      }
      continue;
    }

    if (valeur) {
      const size = Math.min(14, Math.max(8, h * 0.45));
      page.drawText(valeur.slice(0, 80), {
        x: x + 2,
        y: y + h / 2 - size / 3,
        size,
        font,
        color: rgb(0.05, 0.05, 0.1),
        maxWidth: w - 4,
      });
    }
  }

  const bytes = await pdf.save();
  return { bytes, fileName: signedFileName(input.fileName) };
}

function signedFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "document";
  return `${base}-signe.pdf`;
}
