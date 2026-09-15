const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '5000', 10);
const BASE_DIR = __dirname;
const DATA_FILE = path.join(BASE_DIR, 'leads.csv');
const WHATSAPP_NUMBER = process.env.BMI9_WHATSAPP_NUMBER || '5511951605371';
const LOGO_PATH = path.join(BASE_DIR, 'assets', 'bmi9_logo_nova.png');

// In-memory comments and likes
const _comments = {};
const _likes = {
  'obra-honda': 142,
  'obra-galpao': 189,
  'obra-industria': 215,
  'obra-comercial': 98
};

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function sanitize(str, maxLen = 500) {
  if (!str) return '';
  return String(str).trim().slice(0, maxLen);
}

function formatDateNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildPdfFilename(nome) {
  const safe = (nome || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `Orcamento_${safe || 'BMI9'}.pdf`;
}

function buildWhatsAppUrl(nome, telefone, cidade, estado, tipoObra, metragem, mensagem) {
  const cidadeEstado = [cidade, estado].filter(Boolean).join(' - ') || 'não informada';
  const lines = [
    `Olá! Sou *${nome}* e acabei de solicitar um orçamento pelo site da BMI9.`,
    '',
    `*Telefone:* ${telefone}`,
    `*Cidade:* ${cidadeEstado}`,
    `*Tipo:* ${tipoObra || 'não informado'}`,
    `*Metragem:* ${metragem ? metragem + ' m²' : 'não informada'}`,
    '',
    `*Mensagem:* ${mensagem || '—'}`
  ];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

// ── PDF Generation (Vector Binary Stream matching api/index.py) ──
function pdfEscapeText(text) {
  if (!text) return '';
  // Convert UTF-8 to Latin1 / Windows-1252 friendly string
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) {
      // Map common portuguese accented chars or replacements
      const charMap = {
        8211: '-', 8212: '--', 8216: "'", 8217: "'", 8220: '"', 8221: '"', 8226: '*', 8230: '...'
      };
      res += charMap[code] || '?';
    } else {
      res += text[i];
    }
  }
  return res.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfColor(rgb, mode) {
  return `${(rgb[0] / 255).toFixed(3)} ${(rgb[1] / 255).toFixed(3)} ${(rgb[2] / 255).toFixed(3)} ${mode}`;
}

function pdfRect(x, y, w, h, fillRgb, strokeRgb = null, lineWidth = 1) {
  const cmds = ['q'];
  if (fillRgb) cmds.push(pdfColor(fillRgb, 'rg'));
  if (strokeRgb) {
    cmds.push(`${lineWidth.toFixed(2)} w`);
    cmds.push(pdfColor(strokeRgb, 'RG'));
  }
  const op = fillRgb && strokeRgb ? 'B' : strokeRgb ? 'S' : 'f';
  cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
  cmds.push('Q');
  return cmds.join('\n') + '\n';
}

function pdfText(x, y, text, size, rgb, fontAlias) {
  return [
    'BT',
    `/${fontAlias} ${size.toFixed(2)} Tf`,
    pdfColor(rgb, 'rg'),
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${pdfEscapeText(text)}) Tj`,
    'ET'
  ].join('\n') + '\n';
}

function pdfRectTop(pageHeight, x, top, w, h, fillRgb, strokeRgb = null, lineWidth = 1) {
  return pdfRect(x, pageHeight - top - h, w, h, fillRgb, strokeRgb, lineWidth);
}

function pdfTextTop(pageHeight, x, baselineFromTop, text, size, rgb, fontAlias) {
  return pdfText(x, pageHeight - baselineFromTop, text, size, rgb, fontAlias);
}

function pdfWrapLines(text, maxChars) {
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [''];
  const lines = [];
  for (const paragraph of normalized.split('\n')) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let buf = '';
    for (const w of words) {
      if (w.length > maxChars) {
        if (buf) { lines.push(buf); buf = ''; }
        for (let i = 0; i < w.length; i += maxChars) {
          lines.push(w.slice(i, i + maxChars));
        }
        continue;
      }
      const candidate = buf ? `${buf} ${w}` : w;
      if (candidate.length <= maxChars) {
        buf = candidate;
      } else {
        if (buf) lines.push(buf);
        buf = w;
      }
    }
    if (buf) lines.push(buf);
  }
  return lines.length ? lines : [''];
}

function pdfLimitLines(lines, maxLines, maxChars) {
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  let last = trimmed[maxLines - 1];
  const safe = Math.max(1, maxChars - 3);
  if (last.length > safe) last = last.slice(0, safe).trimEnd();
  trimmed[maxLines - 1] = `${last}...`;
  return trimmed;
}

function prepareInfoRows(rows, maxChars) {
  return rows.map(([label, val]) => [label, pdfWrapLines(val || '—', maxChars)]);
}

function measureInfoCardHeight(prepRows) {
  let h = 78.0;
  for (const [, lines] of prepRows) {
    h += 11.0 + (lines.length * 12.5) + 7.5;
  }
  return Math.max(166.0, h);
}

function drawInfoCard(pageHeight, x, top, w, h, title, rows, accentRgb, maxChars) {
  const surface = [255, 255, 255];
  const stroke = [221, 229, 237];
  const shadow = [228, 234, 242];
  const titleColor = [10, 31, 53];
  const labelColor = [98, 117, 140];
  const valueColor = [33, 48, 70];

  const prep = prepareInfoRows(rows, maxChars);
  const contentH = measureInfoCardHeight(prep);
  const vOffset = Math.max(0, (h - contentH) / 2);

  let out = '';
  out += pdfRectTop(pageHeight, x + 4, top + 4, w, h, shadow);
  out += pdfRectTop(pageHeight, x, top, w, h, surface, stroke, 1);
  out += pdfRectTop(pageHeight, x, top, w, 6, accentRgb);
  out += pdfTextTop(pageHeight, x + 18, top + 34 + vOffset, title, 14, titleColor, 'F1');
  out += pdfRectTop(pageHeight, x + 18, top + 46 + vOffset, w - 36, 1, stroke);

  let curTop = top + 67 + vOffset;
  for (const [label, lines] of prep) {
    out += pdfTextTop(pageHeight, x + 18, curTop, label.toUpperCase(), 7.6, labelColor, 'F1');
    curTop += 11;
    for (const line of lines) {
      out += pdfTextTop(pageHeight, x + 18, curTop, line, 11.3, valueColor, 'F2');
      curTop += 12.5;
    }
    curTop += 7.5;
  }
  return out;
}

function extractPngRgba(pngPath) {
  if (!fs.existsSync(pngPath)) return null;
  try {
    const buf = fs.readFileSync(pngPath);
    if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatParts = [];
    let pos = 8;
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      pos += 4;
      const type = buf.slice(pos, pos + 4).toString('ascii');
      pos += 4;
      const chunk = buf.slice(pos, pos + len);
      pos += len + 4; // skip CRC
      if (type === 'IHDR') {
        width = chunk.readUInt32BE(0);
        height = chunk.readUInt32BE(4);
        bitDepth = chunk.readUInt8(8);
        colorType = chunk.readUInt8(9);
        if (bitDepth !== 8) return null;
      } else if (type === 'IDAT') {
        idatParts.push(chunk);
      } else if (type === 'IEND') {
        break;
      }
    }
    if (!idatParts.length || (colorType !== 2 && colorType !== 6)) return null;
    const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
    const bpp = colorType === 6 ? 4 : 3;
    const rowBytes = width * bpp;
    const pixels = Buffer.alloc(width * height * bpp);

    function paeth(a, b, c) {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      if (pa <= pb && pa <= pc) return a;
      if (pb <= pc) return b;
      return c;
    }

    let dPos = 0;
    for (let r = 0; r < height; r++) {
      const fType = decompressed[dPos++];
      const rowData = decompressed.slice(dPos, dPos + rowBytes);
      dPos += rowBytes;
      const priorOffset = (r - 1) * rowBytes;
      const curOffset = r * rowBytes;
      for (let c = 0; c < rowBytes; c++) {
        const raw = rowData[c];
        const left = c >= bpp ? pixels[curOffset + c - bpp] : 0;
        const up = r > 0 ? pixels[priorOffset + c] : 0;
        const upLeft = (r > 0 && c >= bpp) ? pixels[priorOffset + c - bpp] : 0;
        let recon = raw;
        if (fType === 1) recon = (raw + left) & 0xff;
        else if (fType === 2) recon = (raw + up) & 0xff;
        else if (fType === 3) recon = (raw + Math.floor((left + up) / 2)) & 0xff;
        else if (fType === 4) recon = (raw + paeth(left, up, upLeft)) & 0xff;
        pixels[curOffset + c] = recon;
      }
    }

    const rgbData = Buffer.alloc(width * height * 3);
    const alphaData = colorType === 6 ? Buffer.alloc(width * height) : null;
    if (colorType === 6) {
      for (let i = 0; i < width * height; i++) {
        rgbData[i * 3] = pixels[i * 4];
        rgbData[i * 3 + 1] = pixels[i * 4 + 1];
        rgbData[i * 3 + 2] = pixels[i * 4 + 2];
        alphaData[i] = pixels[i * 4 + 3];
      }
    } else {
      pixels.copy(rgbData);
    }
    return {
      width,
      height,
      rgb: zlib.deflateSync(rgbData),
      alpha: alphaData ? zlib.deflateSync(alphaData) : null
    };
  } catch (e) {
    console.error('[PDF LOGO] Erro ao extrair PNG:', e.message);
    return null;
  }
}

function gerarPdfOrcamento(nome, telefone, cidade, estado, tipoObra, metragem, mensagem) {
  const pageWidth = 595;
  const pageHeight = 842;
  const agora = formatDateNow();
  const dObj = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const referencia = `BMI9-${String(dObj.getFullYear()).slice(-2)}${pad(dObj.getMonth() + 1)}${pad(dObj.getDate())}-${pad(dObj.getHours())}${pad(dObj.getMinutes())}${pad(dObj.getSeconds())}`;
  const margem = 42;
  const largConteudo = pageWidth - margem * 2;
  const largGap = 16;
  const largCard = (largConteudo - largGap) / 2;
  const cidadeEstado = [cidade, estado].filter(Boolean).join(' - ') || 'Não informado';
  const valMetragem = metragem ? `${metragem} m²` : 'Não informada';
  const msgBase = mensagem || 'Nenhuma mensagem adicional foi informada pelo cliente.';

  const palette = {
    background: [245, 247, 250],
    brand: [9, 39, 66],
    brandSoft: [22, 62, 94],
    accent: [242, 181, 52],
    accentSoft: [252, 240, 214],
    surface: [255, 255, 255],
    stroke: [220, 228, 237],
    title: [10, 31, 53],
    muted: [98, 117, 140],
    text: [33, 48, 70]
  };

  const rowsContato = [
    ['Nome / empresa', nome || 'Não informado'],
    ['Telefone', telefone || 'Não informado'],
    ['Cidade / estado', cidadeEstado]
  ];
  const rowsProjeto = [
    ['Tipo de obra', tipoObra || 'Não informado'],
    ['Metragem', valMetragem],
    ['Origem', 'Solicitação recebida pelo site BMI9']
  ];

  const infoCharLimit = 29;
  const prepContato = prepareInfoRows(rowsContato, infoCharLimit);
  const prepProjeto = prepareInfoRows(rowsProjeto, infoCharLimit);
  const alturaCards = Math.max(measureInfoCardHeight(prepContato), measureInfoCardHeight(prepProjeto));

  const topoResumo = 248;
  const topoCards = 308;
  const topoMsg = topoCards + alturaCards + 30;
  const topoFooter = 742;
  const alturaFooter = 58;
  const alturaMsg = Math.max(168, topoFooter - topoMsg - 20);
  const alturaHeaderMsg = 58;
  const alturaTextoDisp = alturaMsg - alturaHeaderMsg - 44;
  const maxLinhasMsg = Math.max(4, Math.floor(alturaTextoDisp / 15));
  const linhasMsg = pdfLimitLines(pdfWrapLines(msgBase, 72), maxLinhasMsg, 72);

  let c = '';
  c += pdfRect(0, 0, pageWidth, pageHeight, palette.background);
  c += pdfRectTop(pageHeight, 0, 0, pageWidth, 212, palette.brand);
  c += pdfRectTop(pageHeight, 0, 158, pageWidth, 54, palette.brandSoft);
  c += pdfRectTop(pageHeight, 388, 44, 166, 92, palette.brandSoft, [47, 93, 131], 1);

  const faixaLarg = (largConteudo - 24) / 3;
  c += pdfRectTop(pageHeight, margem, 176, faixaLarg, 16, [18, 53, 82]);
  c += pdfRectTop(pageHeight, margem + faixaLarg + 12, 176, faixaLarg, 16, [18, 53, 82]);
  c += pdfRectTop(pageHeight, margem + faixaLarg * 2 + 24, 176, faixaLarg, 16, [18, 53, 82]);

  const logoInfo = extractPngRgba(LOGO_PATH);
  if (logoInfo) {
    let H_scaled = 42.0;
    let W_scaled = (H_scaled * logoInfo.width) / logoInfo.height;
    if (W_scaled > 160.0) {
      W_scaled = 160.0;
      H_scaled = (W_scaled * logoInfo.height) / logoInfo.width;
    }
    const y_pos = pageHeight - 34 - H_scaled;
    c += `q\n${W_scaled.toFixed(2)} 0 0 ${H_scaled.toFixed(2)} ${margem.toFixed(2)} ${y_pos.toFixed(2)} cm\n/I1 Do\nQ\n`;
  } else {
    c += pdfRectTop(pageHeight, margem, 38, 70, 22, palette.accent);
    c += pdfTextTop(pageHeight, margem + 11, 54, 'BMI9', 16, [0, 0, 0], 'F1');
    c += pdfTextTop(pageHeight, margem, 73, 'CONSTRUÇÃO E REFORMAS', 7, [201, 213, 225], 'F1');
  }

  c += pdfTextTop(pageHeight, margem, 122, 'Solicitação de Orçamento', 24, [255, 255, 255], 'F1');
  c += pdfTextTop(pageHeight, margem, 150, 'Documento executivo com os dados enviados pelo cliente.', 11.2, [214, 222, 231], 'F2');
  c += pdfTextTop(pageHeight, margem + 8, 188, 'Triagem inicial', 8.2, [218, 229, 239], 'F2');
  c += pdfTextTop(pageHeight, margem + faixaLarg + 20, 188, 'Contato comercial', 8.2, [218, 229, 239], 'F2');
  c += pdfTextTop(pageHeight, margem + faixaLarg * 2 + 32, 188, 'Proposta técnica', 8.2, [218, 229, 239], 'F2');

  c += pdfTextTop(pageHeight, 406, 68, 'GERADO EM', 8.5, palette.accent, 'F1');
  c += pdfTextTop(pageHeight, 406, 92, agora, 12, [255, 255, 255], 'F2');
  c += pdfTextTop(pageHeight, 406, 116, 'REFERÊNCIA', 8.2, palette.accent, 'F1');
  c += pdfTextTop(pageHeight, 406, 134, referencia, 10.2, [228, 236, 244], 'F2');

  c += pdfTextTop(pageHeight, margem, topoResumo, 'Resumo do cliente', 18, palette.title, 'F1');
  c += pdfTextTop(pageHeight, margem, topoResumo + 24, 'Os dados foram organizados em blocos para facilitar a triagem comercial.', 10.6, palette.muted, 'F2');

  c += drawInfoCard(pageHeight, margem, topoCards, largCard, alturaCards, 'Contato', rowsContato, palette.accent, infoCharLimit);
  c += drawInfoCard(pageHeight, margem + largCard + largGap, topoCards, largCard, alturaCards, 'Projeto', rowsProjeto, [56, 132, 255], infoCharLimit);

  c += pdfRectTop(pageHeight, margem + 4, topoMsg + 4, largConteudo, alturaMsg, [228, 234, 242]);
  c += pdfRectTop(pageHeight, margem, topoMsg, largConteudo, alturaMsg, palette.surface, palette.stroke, 1);
  c += pdfRectTop(pageHeight, margem, topoMsg, largConteudo, alturaHeaderMsg, palette.accentSoft);
  c += pdfTextTop(pageHeight, margem + 18, topoMsg + 36, 'Escopo e observações do cliente', 13.5, palette.title, 'F1');
  c += pdfTextTop(pageHeight, margem + 18, topoMsg + 56, 'Mensagem enviada no formulário de orçamento.', 10, palette.muted, 'F2');

  let msgY = pageHeight - (topoMsg + 92);
  for (const lin of linhasMsg) {
    c += pdfText(margem + 18, msgY, lin, 11.1, palette.text, 'F2');
    msgY -= 15;
  }

  c += pdfRectTop(pageHeight, margem, topoFooter, largConteudo, alturaFooter, palette.brand);
  c += pdfTextTop(pageHeight, margem + 18, topoFooter + 24, 'Próximos passos: análise técnica, contato comercial e proposta detalhada para a obra.', 9.6, [255, 255, 255], 'F2');
  c += pdfTextTop(pageHeight, margem + 18, topoFooter + 44, 'Documento gerado automaticamente para atendimento comercial da BMI9.', 8.8, [201, 213, 225], 'F2');

  const contentBuf = Buffer.from(c, 'latin1');
  let pageRes = '/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >>';
  if (logoInfo) pageRes += ' /XObject << /I1 8 0 R >>';
  pageRes += ' >>';

  const objs = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ${pageRes} /Contents 7 0 R >> endobj`,
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >> endobj',
    `7 0 obj << /Length ${contentBuf.length} >> stream\n${contentBuf.toString('latin1')}\nendstream\nendobj`
  ];

  if (logoInfo) {
    let imgMeta = `<< /Type /XObject /Subtype /Image /Width ${logoInfo.width} /Height ${logoInfo.height} /BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /FlateDecode`;
    if (logoInfo.alpha) imgMeta += ' /SMask 9 0 R';
    imgMeta += ` /Length ${logoInfo.rgb.length} >>`;
    objs.push(`8 0 obj ${imgMeta} stream\n${logoInfo.rgb.toString('latin1')}\nendstream\nendobj`);

    if (logoInfo.alpha) {
      const smaskMeta = `<< /Type /XObject /Subtype /Image /Width ${logoInfo.width} /Height ${logoInfo.height} /BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /FlateDecode /Length ${logoInfo.alpha.length} >>`;
      objs.push(`9 0 obj ${smaskMeta} stream\n${logoInfo.alpha.toString('latin1')}\nendstream\nendobj`);
    }
  }

  const pdfParts = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = [0];
  let curLen = pdfParts[0].length;

  for (const obj of objs) {
    offsets.push(curLen);
    const ob = Buffer.from(obj + '\n', 'latin1');
    pdfParts.push(ob);
    curLen += ob.length;
  }

  const xref = [`xref\n0 ${objs.length + 1}\n`, '0000000000 65535 f \n'];
  for (let i = 1; i <= objs.length; i++) {
    xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  xref.push(`trailer << /Size ${objs.length + 1} /Root 1 0 R >>\n`);
  xref.push(`startxref\n${curLen}\n%%EOF`);

  pdfParts.push(Buffer.from(xref.join(''), 'latin1'));
  return Buffer.concat(pdfParts);
}

// ── Lead storage ──
function appendLeadCsv(nome, telefone, cidade, estado, tipoObra, metragem, mensagem) {
  try {
    const exists = fs.existsSync(DATA_FILE);
    if (!exists) {
      fs.writeFileSync(DATA_FILE, 'Data,Nome,Telefone,Cidade,Estado,Tipo de Obra,Metragem,Mensagem\n', 'utf-8');
    }
    const escapeCsv = (f) => `"${String(f || '').replace(/"/g, '""')}"`;
    const row = [
      formatDateNow(),
      nome,
      telefone,
      cidade,
      estado,
      tipoObra,
      metragem,
      mensagem
    ].map(escapeCsv).join(',') + '\n';
    fs.appendFileSync(DATA_FILE, row, 'utf-8');
    return true;
  } catch (err) {
    console.error('[LEAD] Erro ao salvar leads.csv:', err.message);
    return false;
  }
}

// ── Request Handler ──
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function handleOrcamento(req, res, bodyStr) {
  let data = {};
  try {
    if (bodyStr.startsWith('{')) {
      data = JSON.parse(bodyStr);
    } else {
      // URL encoded form
      const params = new URLSearchParams(bodyStr);
      data = Object.fromEntries(params.entries());
    }
  } catch (_) {
    data = {};
  }

  // Honeypot
  if (data.website) {
    return sendJson(res, 200, { ok: true, message: 'Orçamento recebido com sucesso.' });
  }

  const nome = sanitize(data.nome, 200);
  const telefone = sanitize(data.telefone, 30);
  const cidade = sanitize(data.cidade, 100);
  const estado = sanitize(data.estado, 2).toUpperCase();
  const tipoObra = sanitize(data.tipo_obra, 50);
  const metragem = sanitize(data.metragem, 20);
  const mensagem = sanitize(data.mensagem, 1000);

  const errors = [];
  if (!nome || nome.length < 2) errors.push('Nome é obrigatório (mínimo 2 caracteres).');
  if (!telefone || !/^[\d\s\-\+\(\)]{8,20}$/.test(telefone)) errors.push('Telefone inválido.');
  if (metragem && isNaN(Number(metragem))) errors.push('Metragem deve ser um número.');

  if (errors.length > 0) {
    return sendJson(res, 400, { ok: false, error: errors.join(' ') });
  }

  // Save lead
  appendLeadCsv(nome, telefone, cidade, estado, tipoObra, metragem, mensagem);

  // Build PDF & WhatsApp
  const pdfBytes = gerarPdfOrcamento(nome, telefone, cidade, estado, tipoObra, metragem, mensagem);
  const pdfFilename = buildPdfFilename(nome);
  const whatsappUrl = buildWhatsAppUrl(nome, telefone, cidade, estado, tipoObra, metragem, mensagem);

  return sendJson(res, 200, {
    ok: true,
    message: 'Orçamento recebido com sucesso.',
    whatsapp_url: whatsappUrl,
    pdf_base64: pdfBytes.toString('base64'),
    pdf_filename: pdfFilename
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    return res.end();
  }

  // API Routes
  if (req.method === 'POST' && (pathname === '/api/orcamento' || pathname === '/contato.php')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => handleOrcamento(req, res, body));
    return;
  }

  if (pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', runtime: 'node' });
  }

  if (pathname === '/admin/leads') {
    if (!fs.existsSync(DATA_FILE)) return sendJson(res, 200, []);
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const items = lines.slice(1).map(l => {
      const parts = l.split(',');
      const obj = {};
      headers.forEach((h, idx) => { obj[h.trim()] = (parts[idx] || '').replace(/^"|"$/g, ''); });
      return obj;
    });
    return sendJson(res, 200, items);
  }

  if (pathname === '/api/comments') {
    if (req.method === 'GET') {
      const pId = parsedUrl.searchParams.get('project_id');
      return sendJson(res, 200, _comments[pId] || []);
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.project_id || !data.author || !data.text) {
            return sendJson(res, 400, { ok: false, error: 'Campos obrigatórios ausentes' });
          }
          const comment = {
            author: sanitize(data.author, 100),
            rating: Math.min(5, Math.max(1, parseInt(data.rating || '5', 10))),
            text: sanitize(data.text, 1000),
            date: formatDateNow().split(' ')[0]
          };
          if (!_comments[data.project_id]) _comments[data.project_id] = [];
          _comments[data.project_id].push(comment);
          return sendJson(res, 200, { ok: true, comment });
        } catch (_) {
          return sendJson(res, 400, { ok: false, error: 'JSON inválido' });
        }
      });
      return;
    }
  }

  if (pathname === '/api/likes') {
    if (req.method === 'GET') {
      const pId = parsedUrl.searchParams.get('project_id');
      return sendJson(res, 200, { ok: true, likes: _likes[pId] || 100 });
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const pId = data.project_id;
          if (!pId) return sendJson(res, 400, { ok: false, error: 'project_id required' });
          const cur = _likes[pId] || 100;
          const next = data.liked ? cur + 1 : Math.max(0, cur - 1);
          _likes[pId] = next;
          return sendJson(res, 200, { ok: true, likes: next });
        } catch (_) {
          return sendJson(res, 400, { ok: false, error: 'JSON inválido' });
        }
      });
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent traversal outside BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    } else {
      filePath = path.join(BASE_DIR, 'index.html');
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n============================================`);
  console.log(`  BMI9 - Servidor Node.js iniciado com sucesso!`);
  console.log(`  Acesse no navegador: http://localhost:${PORT}`);
  console.log(`  API de Orçamento pronta em: /api/orcamento`);
  console.log(`============================================\n`);
});
