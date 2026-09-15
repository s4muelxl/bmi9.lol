from flask import Flask, send_from_directory, jsonify, request, abort
from datetime import datetime
from functools import wraps
import base64
import resend
from typing import List
import csv
from email.message import EmailMessage
import os
import re
import html
import smtplib
import ssl
import time
import traceback
from urllib.parse import quote

def load_env_file(path):
    if not os.path.exists(path):
        return

    try:
        with open(path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue

                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except Exception as exc:
        print(f"[AVISO] Nao foi possivel ler o arquivo .env: {exc}")


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "api":
    BASE_DIR = os.path.dirname(BASE_DIR)
load_env_file(os.path.join(BASE_DIR, ".env"))
DATA_FILE = os.path.join(BASE_DIR, "leads.csv")
WHATSAPP_NUMBER = os.environ.get("BMI9_WHATSAPP_NUMBER", "5511951605371")
CORS_ORIGINS = [o.strip() for o in os.environ.get("BMI9_CORS_ORIGINS", "").split(",") if o.strip()]
ALLOW_ALL_CORS = os.environ.get("BMI9_ALLOW_ALL_CORS", "").lower() in {"1", "true", "yes"}
DEBUG_ERRORS = os.environ.get("BMI9_DEBUG_ERRORS", "").lower() in {"1", "true", "yes"}

# ── Configurações de Administração e E-mail ──
ADMIN_TOKEN = os.environ.get("BMI9_ADMIN_TOKEN", "")
EMAIL_DESTINO = os.environ.get("BMI9_EMAIL_DESTINO", "contato@bmi9.lol")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")  # Defina via variável de ambiente!
RESEND_FROM = os.environ.get("RESEND_FROM", "onboarding@resend.dev")

if RESEND_FROM.endswith("@resend.dev") and not SMTP_PASS:
    print(
        "[AVISO] O projeto esta usando onboarding@resend.dev sem SMTP_PASS. "
        "Nesse modo, o Resend so entrega para o e-mail dono da conta."
    )

app = Flask(
    __name__,
    static_folder=BASE_DIR,
    static_url_path=""
)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024


# =============================================
#  RATE LIMITER
# =============================================
_rate_store = {}
RATE_LIMIT = 5
RATE_WINDOW = 60

def is_rate_limited(ip):
    now = time.time()
    timestamps = _rate_store.get(ip, [])
    timestamps = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(timestamps) >= RATE_LIMIT:
        return True
    timestamps.append(now)
    _rate_store[ip] = timestamps
    return False


# =============================================
#  VALIDAÇÃO / SANITIZAÇÃO
# =============================================
PHONE_REGEX = re.compile(r"^[\d\s\-\+\(\)]{8,20}$")
ESTADOS_BR = {
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
    "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
    "SP","SE","TO"
}
TIPOS_OBRA = {"Galpão Logístico", "Indústria", "Comercial", "Outro"}

def sanitize(value, max_length=500):
    if not value:
        return ""
    return html.escape(str(value).strip()[:max_length])


def build_pdf_filename(nome):
    safe_name = re.sub(r"[^A-Za-z0-9]+", "_", nome).strip("_")
    return f"Orcamento_{safe_name or 'BMI9'}.pdf"


def build_whatsapp_url(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem):
    cidade_estado = " - ".join(part for part in [cidade, estado] if part) or "não informada"
    tipo_obra = tipo_obra or "não informado"
    metragem = f"{metragem} m²" if metragem else "não informada"
    mensagem = mensagem or "—"
    texto = "\n".join([
        f"Olá! Sou *{nome}* e acabei de solicitar um orçamento pelo site da BMI9.",
        "",
        f"*Telefone:* {telefone}",
        f"*Cidade:* {cidade_estado}",
        f"*Tipo:* {tipo_obra}",
        f"*Metragem:* {metragem}",
        "",
        f"*Mensagem:* {mensagem}",
    ])
    return f"https://wa.me/{WHATSAPP_NUMBER}?text={quote(texto)}"


def get_client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded_for or request.remote_addr or "unknown"


def get_request_data():
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        return data
    return request.form.to_dict(flat=True)

def get_cors_origin():
    origin = request.headers.get("Origin")
    if not origin:
        return "*" if ALLOW_ALL_CORS else None
    if ALLOW_ALL_CORS:
        return origin
    if origin == "null":
        return "null"
    if origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
        return origin
    if origin in CORS_ORIGINS:
        return origin
    return "*" if ALLOW_ALL_CORS else None


@app.after_request
def add_cors_headers(response):
    origin = get_cors_origin()
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With, Accept, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def processar_orcamento():
    try:
        ip = get_client_ip()
        if is_rate_limited(ip):
            return jsonify({"ok": False, "error": "Muitas tentativas. Aguarde um momento."}), 429

        data = get_request_data()

        if data.get("website"):
            return jsonify({"ok": True, "message": "Orçamento recebido com sucesso."})

        nome = sanitize(data.get("nome"), 200)
        telefone = sanitize(data.get("telefone"), 30)
        cidade = sanitize(data.get("cidade"), 100)
        estado = sanitize(data.get("estado"), 2).upper()
        tipo_obra = sanitize(data.get("tipo_obra"), 50)
        metragem = sanitize(data.get("metragem"), 20)
        mensagem = sanitize(data.get("mensagem"), 1000)

        errors = []
        if not nome or len(nome) < 2:
            errors.append("Nome é obrigatório (mínimo 2 caracteres).")
        if not telefone or not PHONE_REGEX.match(telefone):
            errors.append("Telefone inválido.")
        if estado and estado not in ESTADOS_BR:
            errors.append("Estado inválido.")
        if tipo_obra and tipo_obra not in TIPOS_OBRA:
            errors.append("Tipo de obra inválido.")
        if metragem:
            try:
                m = float(metragem)
                if m <= 0 or m > 9999999:
                    errors.append("Metragem fora do intervalo válido.")
            except ValueError:
                errors.append("Metragem deve ser um número.")

        if errors:
            return jsonify({"ok": False, "error": " ".join(errors)}), 400

        created_at = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        whatsapp_url = build_whatsapp_url(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem)
        pdf_bytes = gerar_pdf_orcamento(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem)
        pdf_filename = build_pdf_filename(nome)
        warnings = []

        try:
            with open(DATA_FILE, "a", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([created_at, nome, telefone, cidade, estado, tipo_obra, metragem, mensagem])
        except Exception as exc:
            warnings.append("Não foi possível salvar o lead internamente.")
            print(f"[ERRO] Falha ao gravar lead: {exc}")
            print(traceback.format_exc())

        try:
            email_sent, email_message = enviar_email(
                nome,
                telefone,
                cidade,
                estado,
                tipo_obra,
                metragem,
                mensagem,
                pdf_bytes=pdf_bytes,
                pdf_filename=pdf_filename,
            )
            if not email_sent:
                warnings.append(email_message or "Não foi possível enviar o e-mail interno.")
        except Exception as exc:
            warnings.append("Não foi possível enviar o e-mail interno.")
            print(f"[ERRO] Falha inesperada ao enviar e-mail: {exc}")
            print(traceback.format_exc())

        payload = {
            "ok": True,
            "message": "Orçamento recebido com sucesso.",
            "whatsapp_url": whatsapp_url,
            "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
            "pdf_filename": pdf_filename,
        }
        if warnings:
            payload["warning"] = " ".join(warnings)

        return jsonify(payload)
    except Exception as exc:
        print(f"[ERRO] Falha geral ao processar orçamento: {exc}")
        print(traceback.format_exc())
        msg = "Erro interno ao processar o orçamento."
        if DEBUG_ERRORS:
            msg = f"{msg} {exc}"
        return jsonify({"ok": False, "error": msg}), 500


# =============================================
#  EMAIL & PDF (RESEND + REPORTLAB)
# =============================================
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
resend.api_key = RESEND_API_KEY

def _pdf_escape_text(text: str) -> str:
    if text is None:
        text = ""
    # Normalize line breaks and escape PDF special chars
    encoded = text.encode("cp1252", errors="replace").decode("latin-1")
    encoded = encoded.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return encoded


def _pdf_color_command(rgb, mode: str) -> str:
    return f"{rgb[0] / 255:.3f} {rgb[1] / 255:.3f} {rgb[2] / 255:.3f} {mode}"


def _pdf_draw_rect(x: float, y: float, width: float, height: float, fill_rgb, stroke_rgb=None, line_width: float = 1) -> str:
    commands = ["q"]
    if fill_rgb is not None:
        commands.append(_pdf_color_command(fill_rgb, "rg"))
    if stroke_rgb is not None:
        commands.append(f"{line_width:.2f} w")
        commands.append(_pdf_color_command(stroke_rgb, "RG"))

    if fill_rgb is not None and stroke_rgb is not None:
        operator = "B"
    elif stroke_rgb is not None:
        operator = "S"
    else:
        operator = "f"

    commands.append(f"{x:.2f} {y:.2f} {width:.2f} {height:.2f} re {operator}")
    commands.append("Q")
    return "\n".join(commands) + "\n"


def _pdf_draw_text(x: float, y: float, text: str, size: float, rgb, font_alias: str) -> str:
    return "\n".join([
        "BT",
        f"/{font_alias} {size:.2f} Tf",
        _pdf_color_command(rgb, "rg"),
        f"{x:.2f} {y:.2f} Td",
        f"({_pdf_escape_text(text)}) Tj",
        "ET",
    ]) + "\n"


def _pdf_y_from_top(page_height: float, top_offset: float) -> float:
    return page_height - top_offset


def _pdf_draw_rect_top(page_height: float, x: float, top: float, width: float, height: float, fill_rgb, stroke_rgb=None, line_width: float = 1) -> str:
    return _pdf_draw_rect(x, page_height - top - height, width, height, fill_rgb, stroke_rgb, line_width)


def _pdf_draw_text_top(page_height: float, x: float, baseline_from_top: float, text: str, size: float, rgb, font_alias: str) -> str:
    return _pdf_draw_text(x, _pdf_y_from_top(page_height, baseline_from_top), text, size, rgb, font_alias)


def _pdf_wrap_lines(text: str, max_chars: int) -> List[str]:
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return [""]

    lines: List[str] = []
    for paragraph in normalized.split("\n"):
        current = paragraph.strip()
        if not current:
            lines.append("")
            continue

        words = current.split()
        buffer = ""
        for word in words:
            if len(word) > max_chars:
                if buffer:
                    lines.append(buffer)
                    buffer = ""
                chunks = [word[index:index + max_chars] for index in range(0, len(word), max_chars)]
                lines.extend(chunks[:-1])
                buffer = chunks[-1]
                continue

            candidate = word if not buffer else f"{buffer} {word}"
            if len(candidate) <= max_chars:
                buffer = candidate
            else:
                if buffer:
                    lines.append(buffer)
                buffer = word
        if buffer:
            lines.append(buffer)

    return lines or [""]


def _pdf_limit_lines(lines: List[str], max_lines: int, max_chars: int) -> List[str]:
    if len(lines) <= max_lines:
        return lines

    trimmed = list(lines[:max_lines])
    last_line = trimmed[-1]
    safe_limit = max(1, max_chars - 3)
    if len(last_line) > safe_limit:
        last_line = last_line[:safe_limit].rstrip()
    trimmed[-1] = f"{last_line}..."
    return trimmed


def _pdf_prepare_info_rows(rows, value_max_chars: int):
    prepared_rows = []
    for label, value in rows:
        prepared_rows.append((label, _pdf_wrap_lines(value or "—", value_max_chars)))
    return prepared_rows


def extract_png_rgba(png_path):
    import struct
    import zlib
    if not os.path.exists(png_path):
        return None
    try:
        with open(png_path, "rb") as f:
            header = f.read(8)
            if header != b"\x89PNG\r\n\x1a\n":
                return None
            width, height, color_type = 0, 0, 0
            idat_parts = []
            while True:
                length_bytes = f.read(4)
                if not length_bytes:
                    break
                length = struct.unpack(">I", length_bytes)[0]
                chunk_type = f.read(4)
                chunk_data = f.read(length)
                f.read(4) # CRC
                if chunk_type == b"IHDR":
                    width, height, bit_depth, color_type = struct.unpack(">IIBBB", chunk_data[:11])
                    if bit_depth != 8:
                        return None
                elif chunk_type == b"IDAT":
                    idat_parts.append(chunk_data)
                elif chunk_type == b"IEND":
                    break
            if not idat_parts or color_type not in (2, 6):
                return None
            compressed_data = b"".join(idat_parts)
            decompressed = zlib.decompress(compressed_data)
            bpp = 4 if color_type == 6 else 3
            row_bytes = width * bpp
            pixels = bytearray(width * height * bpp)
            def paeth_predictor(a, b, c):
                p = a + b - c
                pa = abs(p - a)
                pb = abs(p - b)
                pc = abs(p - c)
                if pa <= pb and pa <= pc: return a
                elif pb <= pc: return b
                return c
            pos = 0
            for r in range(height):
                filter_type = decompressed[pos]
                pos += 1
                row_data = decompressed[pos : pos + row_bytes]
                pos += row_bytes
                prior_row_offset = (r - 1) * row_bytes
                current_row_offset = r * row_bytes
                for c in range(row_bytes):
                    raw_val = row_data[c]
                    left_val = pixels[current_row_offset + c - bpp] if c >= bpp else 0
                    up_val = pixels[prior_row_offset + c] if r > 0 else 0
                    up_left_val = pixels[prior_row_offset + c - bpp] if (r > 0 and c >= bpp) else 0
                    if filter_type == 0: recon = raw_val
                    elif filter_type == 1: recon = (raw_val + left_val) & 0xFF
                    elif filter_type == 2: recon = (raw_val + up_val) & 0xFF
                    elif filter_type == 3: recon = (raw_val + (left_val + up_val) // 2) & 0xFF
                    elif filter_type == 4: recon = (raw_val + paeth_predictor(left_val, up_val, up_left_val)) & 0xFF
                    else: recon = raw_val
                    pixels[current_row_offset + c] = recon
            rgb_data = bytearray(width * height * 3)
            alpha_data = bytearray(width * height) if color_type == 6 else None
            if color_type == 6:
                for i in range(width * height):
                    rgb_data[i*3] = pixels[i*4]
                    rgb_data[i*3+1] = pixels[i*4+1]
                    rgb_data[i*3+2] = pixels[i*4+2]
                    alpha_data[i] = pixels[i*4+3]
            else:
                rgb_data = pixels
            return {
                "width": width,
                "height": height,
                "rgb": zlib.compress(rgb_data),
                "alpha": zlib.compress(alpha_data) if alpha_data else None
            }
    except Exception as e:
        print(f"[ERRO LOGO] Falha ao processar PNG: {e}")
        return None


def _pdf_measure_info_card_height(prepared_rows) -> float:
    height = 78.0
    for _, lines in prepared_rows:
        height += 11.0
        height += len(lines) * 12.5
        height += 7.5
    return max(166.0, height)


def _pdf_draw_info_card(page_height: float, x: float, top: float, width: float, height: float, title: str, rows, accent_rgb, value_max_chars: int) -> str:
    surface = (255, 255, 255)
    stroke = (221, 229, 237)
    shadow = (228, 234, 242)
    title_color = (10, 31, 53)
    label_color = (98, 117, 140)
    value_color = (33, 48, 70)
    prepared_rows = _pdf_prepare_info_rows(rows, value_max_chars)
    content_height = _pdf_measure_info_card_height(prepared_rows)
    vertical_offset = max(0.0, (height - content_height) / 2)

    commands = ""
    commands += _pdf_draw_rect_top(page_height, x + 4, top + 4, width, height, shadow)
    commands += _pdf_draw_rect_top(page_height, x, top, width, height, surface, stroke, 1)
    commands += _pdf_draw_rect_top(page_height, x, top, width, 6, accent_rgb)
    commands += _pdf_draw_text_top(page_height, x + 18, top + 34 + vertical_offset, title, 14, title_color, "F1")
    commands += _pdf_draw_rect_top(page_height, x + 18, top + 46 + vertical_offset, width - 36, 1, stroke)

    current_top = top + 67 + vertical_offset
    for label, wrapped_lines in prepared_rows:
        commands += _pdf_draw_text_top(page_height, x + 18, current_top, label.upper(), 7.6, label_color, "F1")
        current_top += 11
        for line in wrapped_lines:
            commands += _pdf_draw_text_top(page_height, x + 18, current_top, line, 11.3, value_color, "F2")
            current_top += 12.5
        current_top += 7.5

    return commands


def _pdf_build_content(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem, logo_info=None) -> bytes:
    page_width = 595
    page_height = 842
    agora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    referencia = datetime.now().strftime("BMI9-%y%m%d-%H%M%S")
    margem = 42
    largura_conteudo = page_width - (margem * 2)
    largura_gap = 16
    largura_card = (largura_conteudo - largura_gap) / 2
    cidade_estado = " - ".join(part for part in [cidade, estado] if part) or "Não informado"
    valor_metragem = f"{metragem} m²" if metragem else "Não informada"
    mensagem_base = mensagem or "Nenhuma mensagem adicional foi informada pelo cliente."

    palette = {
        "background": (245, 247, 250),
        "brand": (9, 39, 66),
        "brand_soft": (22, 62, 94),
        "accent": (242, 181, 52),
        "accent_soft": (252, 240, 214),
        "surface": (255, 255, 255),
        "stroke": (220, 228, 237),
        "title": (10, 31, 53),
        "muted": (98, 117, 140),
        "text": (33, 48, 70),
    }

    rows_contato = [
        ("Nome / empresa", nome or "Não informado"),
        ("Telefone", telefone or "Não informado"),
        ("Cidade / estado", cidade_estado),
    ]
    rows_projeto = [
        ("Tipo de obra", tipo_obra or "Não informado"),
        ("Metragem", valor_metragem),
        ("Origem", "Solicitação recebida pelo site BMI9"),
    ]

    info_char_limit = 29
    prepared_contato = _pdf_prepare_info_rows(rows_contato, info_char_limit)
    prepared_projeto = _pdf_prepare_info_rows(rows_projeto, info_char_limit)
    altura_cards = max(
        _pdf_measure_info_card_height(prepared_contato),
        _pdf_measure_info_card_height(prepared_projeto),
    )

    topo_resumo = 248
    topo_cards = 308
    topo_mensagem = topo_cards + altura_cards + 30
    topo_footer = 742
    altura_footer = 58
    altura_mensagem = max(168, topo_footer - topo_mensagem - 20)
    altura_cabecalho_mensagem = 58
    altura_texto_disponivel = altura_mensagem - altura_cabecalho_mensagem - 44
    max_linhas_mensagem = max(4, int(altura_texto_disponivel // 15))
    mensagem_linhas = _pdf_limit_lines(
        _pdf_wrap_lines(mensagem_base, 72),
        max_linhas_mensagem,
        72,
    )

    content = ""
    content += _pdf_draw_rect(0, 0, page_width, page_height, palette["background"])
    content += _pdf_draw_rect_top(page_height, 0, 0, page_width, 212, palette["brand"])
    content += _pdf_draw_rect_top(page_height, 0, 158, page_width, 54, palette["brand_soft"])
    content += _pdf_draw_rect_top(page_height, 388, 44, 166, 92, palette["brand_soft"], (47, 93, 131), 1)

    faixa_largura = (largura_conteudo - 24) / 3
    content += _pdf_draw_rect_top(page_height, margem, 176, faixa_largura, 16, (18, 53, 82))
    content += _pdf_draw_rect_top(page_height, margem + faixa_largura + 12, 176, faixa_largura, 16, (18, 53, 82))
    content += _pdf_draw_rect_top(page_height, margem + (faixa_largura * 2) + 24, 176, faixa_largura, 16, (18, 53, 82))

    if logo_info:
        H_scaled = 42.0
        W_scaled = H_scaled * logo_info["width"] / logo_info["height"]
        if W_scaled > 160.0:
            W_scaled = 160.0
            H_scaled = W_scaled * logo_info["height"] / logo_info["width"]
        y_pos = page_height - 34 - H_scaled
        content += f"q\n{W_scaled:.2f} 0 0 {H_scaled:.2f} {margem:.2f} {y_pos:.2f} cm\n/I1 Do\nQ\n"
    else:
        # Fallback styled text logo badge
        content += _pdf_draw_rect_top(page_height, margem, 38, 70, 22, palette["accent"])
        content += _pdf_draw_text_top(page_height, margem + 11, 54, "BMI9", 16, (0, 0, 0), "F1")
        content += _pdf_draw_text_top(page_height, margem, 73, "CONSTRUÇÃO E REFORMAS", 7, (201, 213, 225), "F1")

    content += _pdf_draw_text_top(page_height, margem, 122, "Solicitação de Orçamento", 24, (255, 255, 255), "F1")
    content += _pdf_draw_text_top(page_height, margem, 150, "Documento executivo com os dados enviados pelo cliente.", 11.2, (214, 222, 231), "F2")
    content += _pdf_draw_text_top(page_height, margem + 8, 188, "Triagem inicial", 8.2, (218, 229, 239), "F2")
    content += _pdf_draw_text_top(page_height, margem + faixa_largura + 20, 188, "Contato comercial", 8.2, (218, 229, 239), "F2")
    content += _pdf_draw_text_top(page_height, margem + (faixa_largura * 2) + 32, 188, "Proposta técnica", 8.2, (218, 229, 239), "F2")

    content += _pdf_draw_text_top(page_height, 406, 68, "GERADO EM", 8.5, palette["accent"], "F1")
    content += _pdf_draw_text_top(page_height, 406, 92, agora, 12, (255, 255, 255), "F2")
    content += _pdf_draw_text_top(page_height, 406, 116, "REFERÊNCIA", 8.2, palette["accent"], "F1")
    content += _pdf_draw_text_top(page_height, 406, 134, referencia, 10.2, (228, 236, 244), "F2")

    content += _pdf_draw_text_top(page_height, margem, topo_resumo, "Resumo do cliente", 18, palette["title"], "F1")
    content += _pdf_draw_text_top(page_height, margem, topo_resumo + 24, "Os dados foram organizados em blocos para facilitar a triagem comercial.", 10.6, palette["muted"], "F2")

    content += _pdf_draw_info_card(page_height, margem, topo_cards, largura_card, altura_cards, "Contato", rows_contato, palette["accent"], info_char_limit)
    content += _pdf_draw_info_card(page_height, margem + largura_card + largura_gap, topo_cards, largura_card, altura_cards, "Projeto", rows_projeto, (56, 132, 255), info_char_limit)

    content += _pdf_draw_rect_top(page_height, margem + 4, topo_mensagem + 4, largura_conteudo, altura_mensagem, (228, 234, 242))
    content += _pdf_draw_rect_top(page_height, margem, topo_mensagem, largura_conteudo, altura_mensagem, palette["surface"], palette["stroke"], 1)
    content += _pdf_draw_rect_top(page_height, margem, topo_mensagem, largura_conteudo, altura_cabecalho_mensagem, palette["accent_soft"])
    content += _pdf_draw_text_top(page_height, margem + 18, topo_mensagem + 36, "Escopo e observações do cliente", 13.5, palette["title"], "F1")
    content += _pdf_draw_text_top(page_height, margem + 18, topo_mensagem + 56, "Mensagem enviada no formulário de orçamento.", 10, palette["muted"], "F2")

    message_y = _pdf_y_from_top(page_height, topo_mensagem + 92)
    for linha in mensagem_linhas:
        content += _pdf_draw_text(margem + 18, message_y, linha, 11.1, palette["text"], "F2")
        message_y -= 15

    content += _pdf_draw_rect_top(page_height, margem, topo_footer, largura_conteudo, altura_footer, palette["brand"])
    content += _pdf_draw_text_top(page_height, margem + 18, topo_footer + 24, "Próximos passos: análise técnica, contato comercial e proposta detalhada para a obra.", 9.6, (255, 255, 255), "F2")
    content += _pdf_draw_text_top(page_height, margem + 18, topo_footer + 44, "Documento gerado automaticamente para atendimento comercial da BMI9.", 8.8, (201, 213, 225), "F2")
    return content.encode("latin-1")


def gerar_pdf_orcamento(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem):
    # Try to load the logo PNG
    logo_info = None
    logo_path = os.path.join(BASE_DIR, "assets", "bmi9_logo_nova.png")
    if os.path.exists(logo_path):
        logo_info = extract_png_rgba(logo_path)

    content_bytes = _pdf_build_content(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem, logo_info=logo_info)

    # Dynamic resources for Page
    page_resource = "/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >>"
    if logo_info:
        page_resource += " /XObject << /I1 8 0 R >>"
    page_resource += " >>"

    objetos = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        f"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] {page_resource} /Contents 7 0 R >> endobj",
        "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj",
        "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj",
        "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >> endobj",
        f"7 0 obj << /Length {len(content_bytes)} >> stream\n{content_bytes.decode('latin-1')}\nendstream\nendobj",
    ]

    if logo_info:
        img_meta = f"<< /Type /XObject /Subtype /Image /Width {logo_info['width']} /Height {logo_info['height']} /BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /FlateDecode"
        if logo_info['alpha']:
            img_meta += " /SMask 9 0 R"
        img_meta += f" /Length {len(logo_info['rgb'])} >>"
        objetos.append(f"8 0 obj {img_meta} stream\n{logo_info['rgb'].decode('latin-1')}\nendstream\nendobj")

        if logo_info['alpha']:
            smask_meta = f"<< /Type /XObject /Subtype /Image /Width {logo_info['width']} /Height {logo_info['height']} /BitsPerComponent 8 /ColorSpace /DeviceGray /Filter /FlateDecode /Length {len(logo_info['alpha'])} >>"
            objetos.append(f"9 0 obj {smask_meta} stream\n{logo_info['alpha'].decode('latin-1')}\nendstream\nendobj")

    pdf_parts: List[bytes] = [b"%PDF-1.4\n"]
    offsets = [0]
    current = len(pdf_parts[0])

    for obj in objetos:
        offsets.append(current)
        obj_bytes = (obj + "\n").encode("latin-1")
        pdf_parts.append(obj_bytes)
        current += len(obj_bytes)

    xref = [f"xref\n0 {len(objetos) + 1}\n", "0000000000 65535 f \n"]
    for i in range(1, len(objetos) + 1):
        xref.append(f"{offsets[i]:010d} 00000 n \n")
    xref.append(f"trailer << /Size {len(objetos) + 1} /Root 1 0 R >>\n")
    xref.append(f"startxref\n{current}\n%%EOF")

    pdf_parts.append("".join(xref).encode("latin-1"))
    return b"".join(pdf_parts)


def _build_email_payload(nome, telefone, tipo_obra):
    assunto = f"Novo Orçamento BMI9 - {nome}"
    corpo = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <div style="background: linear-gradient(135deg, #0a5f8a, #063d5a); padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #f5c518; margin: 0; font-size: 1.4rem;">📋 Nova Solicitação de Orçamento</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">BMI9 Pisos Industriais</p>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;">
        <p>Um novo orçamento foi solicitado no site. O documento PDF com todos os detalhes segue em anexo nesta mensagem.</p>
        <p><b>Resumo:</b></p>
        <ul>
            <li><b>Nome:</b> {nome}</li>
            <li><b>Telefone:</b> {telefone}</li>
            <li><b>Tipo de Obra:</b> {tipo_obra}</li>
        </ul>
        <br>
        <p style="font-size: 0.85rem; color: #888;">Recebido em {datetime.now().strftime('%d/%m/%Y às %H:%M')}</p>
      </div>
    </body>
    </html>
    """
    return assunto, corpo


def _send_email_via_resend(assunto, corpo, pdf_b64, nome_arquivo):
    if not resend.api_key:
        return False, "RESEND_API_KEY não configurada."

    try:
        response = resend.Emails.send({
            "from": RESEND_FROM,
            "to": [EMAIL_DESTINO],
            "subject": assunto,
            "html": corpo,
            "attachments": [
                {
                    "filename": nome_arquivo,
                    "content": pdf_b64
                }
            ]
        })
        print(f"[OK] E-mail enviado para {EMAIL_DESTINO} via Resend. ID: {response.get('id')}")
        return True, "ok"
    except Exception as exc:
        raw_message = str(exc)
        if "only send testing emails to your own email address" in raw_message.lower():
            return (
                False,
                "O Resend esta em modo de teste com onboarding@resend.dev e so pode enviar para o e-mail dono da conta. "
                "Configure RESEND_FROM com um dominio verificado no Resend ou defina SMTP_PASS para usar o Gmail SMTP."
            )
        return False, f"Falha ao enviar via Resend: {raw_message}"


def _send_email_via_smtp(assunto, corpo, pdf_bytes, nome_arquivo):
    if not SMTP_PASS:
        return False, "SMTP_PASS nao configurada para fallback via Gmail."

    message = EmailMessage()
    message["Subject"] = assunto
    message["From"] = SMTP_USER
    message["To"] = EMAIL_DESTINO
    message.set_content(
        "Um novo orcamento foi solicitado no site da BMI9. O PDF com os detalhes segue em anexo."
    )
    message.add_alternative(corpo, subtype="html")
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=nome_arquivo,
    )

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(message)
        print(f"[OK] E-mail enviado para {EMAIL_DESTINO} via SMTP.")
        return True, "ok"
    except Exception as exc:
        return False, f"Falha ao enviar via SMTP: {exc}"


def enviar_email(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem, pdf_bytes=None, pdf_filename=None):
    """Gera o PDF e envia e-mail usando Resend, com fallback SMTP opcional."""
    print(f"[INFO] Enviando orçamento para: {EMAIL_DESTINO}")
    if pdf_bytes is None:
        pdf_bytes = gerar_pdf_orcamento(nome, telefone, cidade, estado, tipo_obra, metragem, mensagem)

    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    nome_arquivo = pdf_filename or build_pdf_filename(nome)
    assunto, corpo = _build_email_payload(nome, telefone, tipo_obra)

    resend_ok, resend_message = _send_email_via_resend(assunto, corpo, pdf_b64, nome_arquivo)
    if resend_ok:
        return True, "ok"

    print(f"[AVISO] {resend_message}")

    smtp_ok, smtp_message = _send_email_via_smtp(assunto, corpo, pdf_bytes, nome_arquivo)
    if smtp_ok:
        return True, "ok"

    print(f"[ERRO] {smtp_message}")
    return False, f"{resend_message} {smtp_message}".strip()


# =============================================
#  ADMIN AUTH
# =============================================
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Bloqueia se o token de administração não estiver configurado no ambiente
        if not ADMIN_TOKEN or ADMIN_TOKEN in {"bmi9-admin-token-TROQUE-ISSO", "SEU_TOKEN_AQUI"}:
            abort(403)
        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if not token or token != ADMIN_TOKEN:
            abort(403)
        return f(*args, **kwargs)
    return decorated


# =============================================
#  INIT
# =============================================
def init_csv():
    if os.path.exists(DATA_FILE):
        return

    try:
        with open(DATA_FILE, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Data", "Nome", "Telefone", "Cidade", "Estado", "Tipo de Obra", "Metragem", "Mensagem"])
    except Exception as exc:
        print(f"[AVISO] Não foi possível inicializar o arquivo de leads: {exc}")

init_csv()


# =============================================
#  SECURITY HEADERS
# =============================================
@app.after_request
def apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' https://images.pexels.com data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    cors_origin = get_cors_origin()
    if cors_origin:
        response.headers["Access-Control-Allow-Origin"] = cors_origin
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS, GET"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept, X-Requested-With"
        response.headers["Vary"] = "Origin"
    response.headers.pop("Server", None)
    return response


# =============================================
#  COMMENTS SYSTEM (WITH PERSISTENCE & FALLBACKS)
# =============================================
import json
import requests
import redis

_in_memory_comments = {}
COMMENTS_DIR = "/tmp" if os.environ.get("VERCEL") else BASE_DIR

_redis_client = None

def get_redis_client():
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    # Check for direct Redis URLs (Vercel KV or custom Redis)
    redis_url = (
        os.environ.get("KV_URL") or 
        os.environ.get("REDIS_URL") or 
        os.environ.get("REDIS_REST_API_URL")
    )
    if redis_url:
        try:
            # redis.from_url supports both redis:// and rediss:// (SSL) protocols natively
            _redis_client = redis.from_url(redis_url, decode_responses=True, socket_timeout=5)
            return _redis_client
        except Exception as e:
            print(f"[REDIS] Error connecting to Redis database: {e}")
    return None

DEFAULT_COMMENTS = {
    "obra-honda": [
        { "author": "Carlos Silva (Gerente)", "rating": 5, "text": "O piso epóxi ficou impecável. A sinalização de segurança ajudou a organizar muito a área de trabalho.", "date": "28/05/2026" },
        { "author": "Roberto Souza", "rating": 5, "text": "Excelente acabamento e pontualidade na entrega.", "date": "29/05/2026" }
    ],
    "obra-galpao": [
        { "author": "Amanda Rocha (Diretora)", "rating": 5, "text": "As cores do piso monolítico ficaram lindas e a limpeza é extremamente simples. As crianças adoraram!", "date": "20/05/2026" },
        { "author": "Patrícia Lima", "rating": 5, "text": "Excelente acabamento, muito seguro e confortável para os brinquedos.", "date": "24/05/2026" }
    ],
    "obra-industria": [
        { "author": "Marcos Oliveira (Supervisor)", "rating": 5, "text": "Resistência excelente para tráfego de empilhadeiras. Recomendo fortemente a BMI9.", "date": "15/05/2026" },
        { "author": "Julio Cezar", "rating": 5, "text": "Equipe muito profissional e atenciosa do início ao fim.", "date": "19/05/2026" }
    ],
    "obra-comercial": [
        { "author": "Tatiane Mendes (Arquiteta)", "rating": 5, "text": "O efeito mármore metálico deu um aspect luxuoso incrível para a sala. Trabalho artístico de primeira!", "date": "10/05/2026" },
        { "author": "Felipe Neto", "rating": 5, "text": "Piso extremamente brilhante e moderno. Excelente!", "date": "14/05/2026" }
    ]
}

def get_comments_file_path(project_id):
    safe_id = re.sub(r"[^A-Za-z0-9_-]", "", project_id)
    return os.path.join(COMMENTS_DIR, f"comments_{safe_id}.json")

def load_comments(project_id):
    # 1. Try native TCP Redis connection (handles REDIS_URL and KV_URL)
    client = get_redis_client()
    if client:
        try:
            data = client.get(f"comments_{project_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"[REDIS] Error loading comments from Redis: {e}")

    # 2. Try Vercel KV REST HTTP fallback
    kv_url = os.environ.get("KV_REST_API_URL") or os.environ.get("ARMAZENAGEM_REST_API_URL")
    kv_token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("ARMAZENAGEM_REST_API_TOKEN")
    if kv_url and kv_token:
        try:
            kv_url_clean = kv_url.rstrip('/')
            headers = {"Authorization": f"Bearer {kv_token}"}
            r = requests.get(f"{kv_url_clean}/get/comments_{project_id}", headers=headers, timeout=5)
            if r.status_code == 200:
                result = r.json().get("result")
                if result:
                    return json.loads(result)
        except Exception as e:
            print(f"[COMMENTS] Error loading from Vercel KV REST: {e}")

    # 3. Try Local File System
    file_path = get_comments_file_path(project_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[COMMENTS] Error loading from file: {e}")

    # 4. Try In-Memory
    if project_id in _in_memory_comments:
        return _in_memory_comments[project_id]

    # 5. Fall back to defaults
    return DEFAULT_COMMENTS.get(project_id, [])

def save_comments(project_id, comments):
    # 1. Try native TCP Redis connection (handles REDIS_URL and KV_URL)
    client = get_redis_client()
    if client:
        try:
            client.set(f"comments_{project_id}", json.dumps(comments))
            return True
        except Exception as e:
            print(f"[REDIS] Error saving comments to Redis: {e}")

    # 2. Try Vercel KV REST HTTP fallback
    kv_url = os.environ.get("KV_REST_API_URL") or os.environ.get("ARMAZENAGEM_REST_API_URL")
    kv_token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("ARMAZENAGEM_REST_API_TOKEN")
    if kv_url and kv_token:
        try:
            kv_url_clean = kv_url.rstrip('/')
            headers = {"Authorization": f"Bearer {kv_token}"}
            payload = ["SET", f"comments_{project_id}", json.dumps(comments)]
            r = requests.post(f"{kv_url_clean}/", headers=headers, json=payload, timeout=5)
            if r.status_code == 200:
                return True
        except Exception as e:
            print(f"[COMMENTS] Error saving to Vercel KV REST: {e}")

    # 3. Try Local File System
    file_path = get_comments_file_path(project_id)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(comments, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[COMMENTS] Error saving to file: {e}")

    # 4. Fall back to In-Memory
    _in_memory_comments[project_id] = comments
    return True


_in_memory_likes = {}

BASE_LIKES = {
    "obra-honda": 247,
    "obra-galpao": 189,
    "obra-industria": 156,
    "obra-comercial": 112
}

def load_likes(project_id):
    # 1. Try native TCP Redis connection
    client = get_redis_client()
    if client:
        try:
            val = client.get(f"likes_{project_id}")
            if val is not None:
                return int(val)
        except Exception as e:
            print(f"[REDIS] Error loading likes from Redis: {e}")

    # 2. Try Vercel KV REST HTTP fallback
    kv_url = os.environ.get("KV_REST_API_URL") or os.environ.get("ARMAZENAGEM_REST_API_URL")
    kv_token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("ARMAZENAGEM_REST_API_TOKEN")
    if kv_url and kv_token:
        try:
            kv_url_clean = kv_url.rstrip('/')
            headers = {"Authorization": f"Bearer {kv_token}"}
            r = requests.get(f"{kv_url_clean}/get/likes_{project_id}", headers=headers, timeout=5)
            if r.status_code == 200:
                result = r.json().get("result")
                if result is not None:
                    return int(result)
        except Exception as e:
            print(f"[COMMENTS] Error loading likes from Vercel KV REST: {e}")

    # 3. Try In-Memory
    if project_id in _in_memory_likes:
        return _in_memory_likes[project_id]

    # 4. Fall back to base likes value
    return BASE_LIKES.get(project_id, 100)

def save_likes(project_id, likes):
    # 1. Try native TCP Redis connection
    client = get_redis_client()
    if client:
        try:
            client.set(f"likes_{project_id}", likes)
            return True
        except Exception as e:
            print(f"[REDIS] Error saving likes to Redis: {e}")

    # 2. Try Vercel KV REST HTTP fallback
    kv_url = os.environ.get("KV_REST_API_URL") or os.environ.get("ARMAZENAGEM_REST_API_URL")
    kv_token = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("ARMAZENAGEM_REST_API_TOKEN")
    if kv_url and kv_token:
        try:
            kv_url_clean = kv_url.rstrip('/')
            headers = {"Authorization": f"Bearer {kv_token}"}
            payload = ["SET", f"likes_{project_id}", str(likes)]
            r = requests.post(f"{kv_url_clean}/", headers=headers, json=payload, timeout=5)
            if r.status_code == 200:
                return True
        except Exception as e:
            print(f"[COMMENTS] Error saving likes to Vercel KV REST: {e}")

    # 3. Fall back to In-Memory
    _in_memory_likes[project_id] = likes
    return True


# =============================================
#  ROUTES
# =============================================
@app.route("/api/comments", methods=["GET", "POST", "OPTIONS"])
def api_comments():
    if request.method == "OPTIONS":
        return ("", 204)

    if request.method == "GET":
        project_id = request.args.get("project_id")
        if not project_id:
            return jsonify({"ok": False, "error": "project_id is required"}), 400
        comments = load_comments(project_id)
        return jsonify(comments)

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        project_id = data.get("project_id")
        author = sanitize(data.get("author"), 100)
        text = sanitize(data.get("text"), 1000)
        rating = data.get("rating", 5)

        if not project_id or not author or not text:
            return jsonify({"ok": False, "error": "Campos obrigatórios ausentes"}), 400

        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                rating = 5
        except ValueError:
            rating = 5

        new_comment = {
            "author": author,
            "rating": rating,
            "text": text,
            "date": datetime.now().strftime("%d/%m/%Y")
        }

        comments = load_comments(project_id)
        comments.append(new_comment)
        save_comments(project_id, comments)

        return jsonify({"ok": True, "comment": new_comment})


@app.route("/api/likes", methods=["GET", "POST", "OPTIONS"])
def api_likes():
    if request.method == "OPTIONS":
        return ("", 204)

    if request.method == "GET":
        project_id = request.args.get("project_id")
        if not project_id:
            return jsonify({"ok": False, "error": "project_id is required"}), 400
        likes_count = load_likes(project_id)
        return jsonify({"ok": True, "likes": likes_count})

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        project_id = data.get("project_id")
        liked = data.get("liked") # True if liked, False if unliked

        if not project_id or liked is None:
            return jsonify({"ok": False, "error": "project_id and liked are required"}), 400

        current_likes = load_likes(project_id)
        if liked:
            current_likes += 1
        else:
            current_likes = max(0, current_likes - 1)

        save_likes(project_id, current_likes)
        return jsonify({"ok": True, "likes": current_likes})


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/api/orcamento", methods=["POST", "OPTIONS"])
def receber_orcamento():
    if request.method == "OPTIONS":
        return ("", 204)
    return processar_orcamento()


@app.route("/contato.php", methods=["POST", "OPTIONS"])
def receber_orcamento_php():
    if request.method == "OPTIONS":
        return ("", 204)
    return processar_orcamento()


@app.route("/admin/leads", methods=["GET"])
@require_admin
def listar_leads():
    if not os.path.exists(DATA_FILE):
        return jsonify([])
    leads = []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads.append(row)
    return jsonify(leads)


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5000)
