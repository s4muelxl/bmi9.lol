<?php
define("BMI9_EMAIL_DESTINO", getenv("BMI9_EMAIL_DESTINO") ? getenv("BMI9_EMAIL_DESTINO") : "contato@bmi9.lol");
define("BMI9_WHATSAPP_NUMBER", getenv("BMI9_WHATSAPP_NUMBER") ? getenv("BMI9_WHATSAPP_NUMBER") : "5511951605371");
define("BMI9_RESEND_FROM", getenv("RESEND_FROM") ? getenv("RESEND_FROM") : "onboarding@resend.dev");
define("BMI9_RESEND_API_KEY", getenv("RESEND_API_KEY") ? getenv("RESEND_API_KEY") : "");
define("BMI9_RESEND_API_URL", "https://api.resend.com/emails");

$autoloadPath = __DIR__ . "/vendor/autoload.php";
if (file_exists($autoloadPath)) {
  require_once $autoloadPath;
}

function sanitize($value) {
  return trim(strip_tags($value));
}

function get_request_data() {
  $contentType = isset($_SERVER["CONTENT_TYPE"]) ? strtolower($_SERVER["CONTENT_TYPE"]) : "";
  if (strpos($contentType, "application/json") !== false) {
    $rawBody = file_get_contents("php://input");
    if ($rawBody !== false && trim($rawBody) !== "") {
      $decoded = json_decode($rawBody, true);
      if (is_array($decoded)) {
        return $decoded;
      }
    }
  }

  return $_POST;
}

function json_response($status, $payload) {
  if (function_exists("http_response_code")) {
    http_response_code($status);
  } else {
    header("X-PHP-Response-Code: " . $status, true, $status);
  }
  header("Content-Type: application/json; charset=utf-8");
  $jsonFlags = 0;
  if (defined("JSON_UNESCAPED_UNICODE")) {
    $jsonFlags |= JSON_UNESCAPED_UNICODE;
  }
  if (defined("JSON_UNESCAPED_SLASHES")) {
    $jsonFlags |= JSON_UNESCAPED_SLASHES;
  }
  echo json_encode($payload, $jsonFlags);
  exit;
}

function wants_json() {
  if ((isset($_GET["ajax"]) && $_GET["ajax"] === "1") || (isset($_POST["ajax"]) && $_POST["ajax"] === "1")) {
    return true;
  }
  $requestedWith = isset($_SERVER["HTTP_X_REQUESTED_WITH"]) ? strtolower($_SERVER["HTTP_X_REQUESTED_WITH"]) : "";
  if ($requestedWith === "xmlhttprequest") {
    return true;
  }
  $accept = isset($_SERVER["HTTP_ACCEPT"]) ? $_SERVER["HTTP_ACCEPT"] : "";
  return strpos($accept, "application/json") !== false;
}

function build_pdf_filename($nome) {
  $safeName = preg_replace("/[^A-Za-z0-9]+/", "_", $nome);
  $safeName = trim($safeName, "_");
  if ($safeName === "") {
    $safeName = "BMI9";
  }
  return "Orcamento_" . $safeName . ".pdf";
}

function build_whatsapp_url($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem) {
  $cidadeEstado = trim($cidade . ($estado !== "" ? " - " . $estado : ""), " -");
  $linhas = [
    "Olá! Sou *" . $nome . "* e acabei de solicitar um orçamento pelo site da BMI9.",
    "",
    "*Telefone:* " . $telefone,
    "*Cidade:* " . ($cidadeEstado !== "" ? $cidadeEstado : "não informada"),
    "*Tipo:* " . ($tipoObra !== "" ? $tipoObra : "não informado"),
    "*Metragem:* " . ($metragem !== "" ? $metragem . " m²" : "não informada"),
    "",
    "*Mensagem:* " . ($mensagem !== "" ? $mensagem : "—"),
  ];

  return "https://wa.me/" . BMI9_WHATSAPP_NUMBER . "?text=" . rawurlencode(implode("\n", $linhas));
}

function pdf_escape_text($text) {
  $encoded = $text;
  if (function_exists("iconv")) {
    $converted = iconv("UTF-8", "Windows-1252//TRANSLIT//IGNORE", $text);
    if ($converted !== false) {
      $encoded = $converted;
    }
  }
  $encoded = str_replace("\\", "\\\\", $encoded);
  $encoded = str_replace("(", "\\(", $encoded);
  $encoded = str_replace(")", "\\)", $encoded);
  return $encoded;
}

function pdf_strlen_chars($text) {
  if (function_exists("mb_strlen")) {
    return mb_strlen($text, "UTF-8");
  }

  if (preg_match_all('/./us', $text, $matches)) {
    return count($matches[0]);
  }

  return strlen($text);
}

function pdf_chunk_text($text, $chunkSize) {
  if ($chunkSize <= 0) {
    return [$text];
  }

  if (function_exists("mb_str_split")) {
    return mb_str_split($text, $chunkSize, "UTF-8");
  }

  if (preg_match_all('/./us', $text, $matches)) {
    $chunks = [];
    foreach (array_chunk($matches[0], $chunkSize) as $chunk) {
      $chunks[] = implode("", $chunk);
    }
    return $chunks;
  }

  return str_split($text, $chunkSize);
}

function pdf_uppercase_text($text) {
  if (function_exists("mb_strtoupper")) {
    return mb_strtoupper($text, "UTF-8");
  }

  return strtoupper($text);
}

function pdf_color_command($rgb, $mode) {
  return sprintf("%.3F %.3F %.3F %s", $rgb[0] / 255, $rgb[1] / 255, $rgb[2] / 255, $mode);
}

function pdf_draw_rect($x, $y, $width, $height, $fillRgb, $strokeRgb = null, $lineWidth = 1) {
  $commands = ["q"];
  if ($fillRgb !== null) {
    $commands[] = pdf_color_command($fillRgb, "rg");
  }
  if ($strokeRgb !== null) {
    $commands[] = sprintf("%.2F w", $lineWidth);
    $commands[] = pdf_color_command($strokeRgb, "RG");
  }

  if ($fillRgb !== null && $strokeRgb !== null) {
    $operator = "B";
  } elseif ($strokeRgb !== null) {
    $operator = "S";
  } else {
    $operator = "f";
  }

  $commands[] = sprintf("%.2F %.2F %.2F %.2F re %s", $x, $y, $width, $height, $operator);
  $commands[] = "Q";
  return implode("\n", $commands) . "\n";
}

function pdf_draw_text($x, $y, $text, $size, $rgb, $fontAlias) {
  return implode("\n", [
    "BT",
    sprintf("/%s %.2F Tf", $fontAlias, $size),
    pdf_color_command($rgb, "rg"),
    sprintf("%.2F %.2F Td", $x, $y),
    "(" . pdf_escape_text($text) . ") Tj",
    "ET",
  ]) . "\n";
}

function pdf_y_from_top($pageHeight, $topOffset) {
  return $pageHeight - $topOffset;
}

function pdf_draw_rect_top($pageHeight, $x, $top, $width, $height, $fillRgb, $strokeRgb = null, $lineWidth = 1) {
  return pdf_draw_rect($x, $pageHeight - $top - $height, $width, $height, $fillRgb, $strokeRgb, $lineWidth);
}

function pdf_draw_text_top($pageHeight, $x, $baselineFromTop, $text, $size, $rgb, $fontAlias) {
  return pdf_draw_text($x, pdf_y_from_top($pageHeight, $baselineFromTop), $text, $size, $rgb, $fontAlias);
}

function pdf_wrap_lines($text, $maxChars) {
  $normalized = preg_replace("/\r\n|\r|\n/", "\n", trim($text));
  if ($normalized === "") {
    return [""];
  }

  $lines = [];
  $paragraphs = explode("\n", $normalized);
  foreach ($paragraphs as $paragraph) {
    $current = trim($paragraph);
    if ($current === "") {
      $lines[] = "";
      continue;
    }

    $words = preg_split('/\s+/u', $current);
    $buffer = "";
    foreach ($words as $word) {
      if (pdf_strlen_chars($word) > $maxChars) {
        if ($buffer !== "") {
          $lines[] = $buffer;
          $buffer = "";
        }

        $chunks = pdf_chunk_text($word, $maxChars);
        if (count($chunks) > 1) {
          $lines = array_merge($lines, array_slice($chunks, 0, -1));
        }
        $buffer = $chunks[count($chunks) - 1];
        continue;
      }

      $candidate = $buffer === "" ? $word : $buffer . " " . $word;
      if (pdf_strlen_chars($candidate) <= $maxChars) {
        $buffer = $candidate;
      } else {
        if ($buffer !== "") {
          $lines[] = $buffer;
        }
        $buffer = $word;
      }
    }

    if ($buffer !== "") {
      $lines[] = $buffer;
    }
  }

  return !empty($lines) ? $lines : [""];
}

function pdf_limit_lines($lines, $maxLines, $maxChars) {
  if (count($lines) <= $maxLines) {
    return $lines;
  }

  $trimmed = array_slice($lines, 0, $maxLines);
  $lastLine = $trimmed[$maxLines - 1];
  $safeLimit = max(1, $maxChars - 3);
  if (pdf_strlen_chars($lastLine) > $safeLimit) {
    $lastLine = rtrim(implode("", array_slice(pdf_chunk_text($lastLine, 1), 0, $safeLimit)));
  }
  $trimmed[$maxLines - 1] = $lastLine . "...";
  return $trimmed;
}

function pdf_prepare_info_rows($rows, $valueMaxChars) {
  $prepared = [];
  foreach ($rows as $row) {
    $label = isset($row[0]) ? $row[0] : "";
    $value = isset($row[1]) ? $row[1] : "—";
    $prepared[] = [$label, pdf_wrap_lines($value, $valueMaxChars)];
  }
  return $prepared;
}

function pdf_measure_info_card_height($preparedRows) {
  $height = 78.0;
  foreach ($preparedRows as $row) {
    $lines = isset($row[1]) ? $row[1] : [""];
    $height += 11.0;
    $height += count($lines) * 12.5;
    $height += 7.5;
  }
  return max(166.0, $height);
}

function pdf_draw_info_card($pageHeight, $x, $top, $width, $height, $title, $rows, $accentRgb, $valueMaxChars) {
  $surface = [255, 255, 255];
  $stroke = [221, 229, 237];
  $shadow = [228, 234, 242];
  $titleColor = [10, 31, 53];
  $labelColor = [98, 117, 140];
  $valueColor = [33, 48, 70];
  $preparedRows = pdf_prepare_info_rows($rows, $valueMaxChars);
  $contentHeight = pdf_measure_info_card_height($preparedRows);
  $verticalOffset = max(0, ($height - $contentHeight) / 2);
  $commands = "";

  $commands .= pdf_draw_rect_top($pageHeight, $x + 4, $top + 4, $width, $height, $shadow);
  $commands .= pdf_draw_rect_top($pageHeight, $x, $top, $width, $height, $surface, $stroke, 1);
  $commands .= pdf_draw_rect_top($pageHeight, $x, $top, $width, 6, $accentRgb);
  $commands .= pdf_draw_text_top($pageHeight, $x + 18, $top + 34 + $verticalOffset, $title, 14, $titleColor, "F1");
  $commands .= pdf_draw_rect_top($pageHeight, $x + 18, $top + 46 + $verticalOffset, $width - 36, 1, $stroke);

  $currentTop = $top + 67 + $verticalOffset;
  foreach ($preparedRows as $row) {
    $label = isset($row[0]) ? pdf_uppercase_text($row[0]) : "";
    $wrappedLines = isset($row[1]) ? $row[1] : ["—"];
    $commands .= pdf_draw_text_top($pageHeight, $x + 18, $currentTop, $label, 7.6, $labelColor, "F1");
    $currentTop += 11;
    foreach ($wrappedLines as $line) {
      $commands .= pdf_draw_text_top($pageHeight, $x + 18, $currentTop, $line, 11.3, $valueColor, "F2");
      $currentTop += 12.5;
    }
    $currentTop += 7.5;
  }

  return $commands;
}

function create_resend_client() {
  if (BMI9_RESEND_API_KEY === "") {
    return null;
  }

  if (class_exists("Resend")) {
    return Resend::client(BMI9_RESEND_API_KEY);
  }
  if (class_exists("Resend\\Resend")) {
    return \Resend\Resend::client(BMI9_RESEND_API_KEY);
  }

  return "rest";
}

function send_resend_request($payload) {
  $jsonPayload = json_encode($payload);
  if ($jsonPayload === false) {
    return [false, "Falha ao serializar o payload do Resend."];
  }

  if (function_exists("curl_init")) {
    $ch = curl_init(BMI9_RESEND_API_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      "Authorization: Bearer " . BMI9_RESEND_API_KEY,
      "Content-Type: application/json",
      "Accept: application/json",
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    $responseBody = curl_exec($ch);
    $curlError = curl_error($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($responseBody === false) {
      return [false, "Erro cURL: " . $curlError];
    }

    if ($statusCode >= 200 && $statusCode < 300) {
      return [true, $responseBody];
    }

    return [false, "Resend HTTP " . $statusCode . ": " . $responseBody];
  }

  if (ini_get("allow_url_fopen")) {
    $context = stream_context_create([
      "http" => [
        "method" => "POST",
        "header" => implode("\r\n", [
          "Authorization: Bearer " . BMI9_RESEND_API_KEY,
          "Content-Type: application/json",
          "Accept: application/json",
        ]),
        "content" => $jsonPayload,
        "timeout" => 20,
        "ignore_errors" => true,
      ],
    ]);

    $responseBody = @file_get_contents(BMI9_RESEND_API_URL, false, $context);
    $statusLine = isset($http_response_header[0]) ? $http_response_header[0] : "";
    preg_match("/\s(\d{3})\s/", $statusLine, $matches);
    $statusCode = isset($matches[1]) ? (int) $matches[1] : 0;

    if ($responseBody !== false && $statusCode >= 200 && $statusCode < 300) {
      return [true, $responseBody];
    }

    return [false, "Resend HTTP " . $statusCode . ": " . ($responseBody !== false ? $responseBody : "sem resposta")];
  }

  return [false, "Nem cURL nem allow_url_fopen estao disponiveis no servidor."];
}

function gerar_pdf_orcamento($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem) {
  $agora = date("d/m/Y H:i:s");
  $referencia = "BMI9-" . date("ymd-His");
  $pageWidth = 595;
  $pageHeight = 842;
  $margem = 42;
  $larguraConteudo = $pageWidth - ($margem * 2);
  $larguraGap = 16;
  $larguraCard = ($larguraConteudo - $larguraGap) / 2;
  $palette = [
    "background" => [245, 247, 250],
    "brand" => [9, 39, 66],
    "brandSoft" => [22, 62, 94],
    "accent" => [242, 181, 52],
    "accentSoft" => [252, 240, 214],
    "surface" => [255, 255, 255],
    "stroke" => [220, 228, 237],
    "title" => [10, 31, 53],
    "muted" => [98, 117, 140],
    "text" => [33, 48, 70],
  ];

  $cidadeEstado = implode(" - ", array_values(array_filter([$cidade, $estado])));
  if ($cidadeEstado === "") {
    $cidadeEstado = "Não informado";
  }
  $valorMetragem = $metragem !== "" ? $metragem . " m²" : "Não informada";
  $mensagemTexto = $mensagem !== "" ? $mensagem : "Nenhuma mensagem adicional foi informada pelo cliente.";

  $rowsContato = [
    ["Nome / empresa", $nome !== "" ? $nome : "Não informado"],
    ["Telefone", $telefone !== "" ? $telefone : "Não informado"],
    ["Cidade / estado", $cidadeEstado],
  ];
  $rowsProjeto = [
    ["Tipo de obra", $tipoObra !== "" ? $tipoObra : "Não informado"],
    ["Metragem", $valorMetragem],
    ["Origem", "Solicitação recebida pelo site BMI9"],
  ];

  $infoCharLimit = 29;
  $preparedContato = pdf_prepare_info_rows($rowsContato, $infoCharLimit);
  $preparedProjeto = pdf_prepare_info_rows($rowsProjeto, $infoCharLimit);
  $alturaCards = max(
    pdf_measure_info_card_height($preparedContato),
    pdf_measure_info_card_height($preparedProjeto)
  );

  $topoResumo = 248;
  $topoCards = 308;
  $topoMensagem = $topoCards + $alturaCards + 30;
  $topoFooter = 742;
  $alturaFooter = 58;
  $alturaMensagem = max(168, $topoFooter - $topoMensagem - 20);
  $alturaCabecalhoMensagem = 58;
  $alturaTextoDisponivel = $alturaMensagem - $alturaCabecalhoMensagem - 44;
  $maxLinhasMensagem = max(4, (int) floor($alturaTextoDisponivel / 15));
  $mensagemLinhas = pdf_limit_lines(pdf_wrap_lines($mensagemTexto, 72), $maxLinhasMensagem, 72);

  $conteudo = "";
  $conteudo .= pdf_draw_rect(0, 0, $pageWidth, $pageHeight, $palette["background"]);
  $conteudo .= pdf_draw_rect_top($pageHeight, 0, 0, $pageWidth, 212, $palette["brand"]);
  $conteudo .= pdf_draw_rect_top($pageHeight, 0, 158, $pageWidth, 54, $palette["brandSoft"]);
  $conteudo .= pdf_draw_rect_top($pageHeight, $margem, 74, 136, 6, $palette["accent"]);
  $conteudo .= pdf_draw_rect_top($pageHeight, 388, 44, 166, 92, $palette["brandSoft"], [47, 93, 131], 1);

  $faixaLargura = ($larguraConteudo - 24) / 3;
  $conteudo .= pdf_draw_rect_top($pageHeight, $margem, 176, $faixaLargura, 16, [18, 53, 82]);
  $conteudo .= pdf_draw_rect_top($pageHeight, $margem + $faixaLargura + 12, 176, $faixaLargura, 16, [18, 53, 82]);
  $conteudo .= pdf_draw_rect_top($pageHeight, $margem + ($faixaLargura * 2) + 24, 176, $faixaLargura, 16, [18, 53, 82]);

  $conteudo .= pdf_draw_text_top($pageHeight, $margem, 48, "BMI9", 28, [255, 255, 255], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem, 72, "PISOS INDUSTRIAIS", 10.5, [201, 213, 225], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem, 122, "Solicitação de Orçamento", 24, [255, 255, 255], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem, 150, "Documento executivo com os dados enviados pelo cliente.", 11.2, [214, 222, 231], "F2");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + 8, 188, "Triagem inicial", 8.2, [218, 229, 239], "F2");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + $faixaLargura + 20, 188, "Contato comercial", 8.2, [218, 229, 239], "F2");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + ($faixaLargura * 2) + 32, 188, "Proposta técnica", 8.2, [218, 229, 239], "F2");

  $conteudo .= pdf_draw_text_top($pageHeight, 406, 68, "GERADO EM", 8.5, $palette["accent"], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, 406, 92, $agora, 12, [255, 255, 255], "F2");
  $conteudo .= pdf_draw_text_top($pageHeight, 406, 116, "REFERÊNCIA", 8.2, $palette["accent"], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, 406, 134, $referencia, 10.2, [228, 236, 244], "F2");

  $conteudo .= pdf_draw_text_top($pageHeight, $margem, $topoResumo, "Resumo do cliente", 18, $palette["title"], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem, $topoResumo + 24, "Os dados foram organizados em blocos para facilitar a triagem comercial.", 10.6, $palette["muted"], "F2");

  $conteudo .= pdf_draw_info_card($pageHeight, $margem, $topoCards, $larguraCard, $alturaCards, "Contato", $rowsContato, $palette["accent"], $infoCharLimit);
  $conteudo .= pdf_draw_info_card($pageHeight, $margem + $larguraCard + $larguraGap, $topoCards, $larguraCard, $alturaCards, "Projeto", $rowsProjeto, [56, 132, 255], $infoCharLimit);

  $conteudo .= pdf_draw_rect_top($pageHeight, $margem + 4, $topoMensagem + 4, $larguraConteudo, $alturaMensagem, [228, 234, 242]);
  $conteudo .= pdf_draw_rect_top($pageHeight, $margem, $topoMensagem, $larguraConteudo, $alturaMensagem, $palette["surface"], $palette["stroke"], 1);
  $conteudo .= pdf_draw_rect_top($pageHeight, $margem, $topoMensagem, $larguraConteudo, $alturaCabecalhoMensagem, $palette["accentSoft"]);
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + 18, $topoMensagem + 36, "Escopo e observações do cliente", 13.5, $palette["title"], "F1");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + 18, $topoMensagem + 56, "Mensagem enviada no formulário de orçamento.", 10, $palette["muted"], "F2");

  $messageY = pdf_y_from_top($pageHeight, $topoMensagem + 92);
  foreach ($mensagemLinhas as $linha) {
    $conteudo .= pdf_draw_text($margem + 18, $messageY, $linha, 11.1, $palette["text"], "F2");
    $messageY -= 15;
  }

  $conteudo .= pdf_draw_rect_top($pageHeight, $margem, $topoFooter, $larguraConteudo, $alturaFooter, $palette["brand"]);
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + 18, $topoFooter + 24, "Próximos passos: análise técnica, contato comercial e proposta detalhada para a obra.", 9.6, [255, 255, 255], "F2");
  $conteudo .= pdf_draw_text_top($pageHeight, $margem + 18, $topoFooter + 44, "Documento gerado automaticamente para atendimento comercial da BMI9.", 8.8, [201, 213, 225], "F2");

  $objetos = [];
  $objetos[] = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj";
  $objetos[] = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj";
  $objetos[] = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >> endobj";
  $objetos[] = "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj";
  $objetos[] = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj";
  $objetos[] = "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >> endobj";
  $objetos[] = "7 0 obj << /Length " . strlen($conteudo) . " >> stream\n" . $conteudo . "\nendstream\nendobj";

  $pdf = "%PDF-1.4\n";
  $offsets = [0];
  foreach ($objetos as $objeto) {
    $offsets[] = strlen($pdf);
    $pdf .= $objeto . "\n";
  }

  $xrefOffset = strlen($pdf);
  $pdf .= "xref\n0 " . (count($objetos) + 1) . "\n";
  $pdf .= "0000000000 65535 f \n";
  for ($i = 1; $i <= count($objetos); $i++) {
    $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
  }
  $pdf .= "trailer << /Size " . (count($objetos) + 1) . " /Root 1 0 R >>\n";
  $pdf .= "startxref\n" . $xrefOffset . "\n%%EOF";

  return $pdf;
}

function enviar_email_resend($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem, $pdfBytes, $pdfFilename) {
  $resend = create_resend_client();
  if ($resend === null) {
    return [false, "RESEND_API_KEY nao configurada no PHP."];
  }
  $assunto = "Novo Orçamento BMI9 - " . $nome;
  $corpo = "<html><body style=\"font-family: Arial, sans-serif; color: #333; max-width: 600px;\">"
    . "<div style=\"background: linear-gradient(135deg, #0a5f8a, #063d5a); padding: 20px; border-radius: 12px 12px 0 0;\">"
    . "<h1 style=\"color: #f5c518; margin: 0; font-size: 1.4rem;\">Nova Solicitação de Orçamento</h1>"
    . "<p style=\"color: rgba(255,255,255,0.8); margin: 4px 0 0;\">BMI9 Pisos Industriais</p>"
    . "</div>"
    . "<div style=\"background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;\">"
    . "<p>Um novo orçamento foi solicitado no site. O PDF com todos os detalhes segue em anexo.</p>"
    . "<ul>"
    . "<li><strong>Nome:</strong> " . htmlspecialchars($nome, ENT_QUOTES, "UTF-8") . "</li>"
    . "<li><strong>Telefone:</strong> " . htmlspecialchars($telefone, ENT_QUOTES, "UTF-8") . "</li>"
    . "<li><strong>Cidade:</strong> " . htmlspecialchars($cidade, ENT_QUOTES, "UTF-8") . "</li>"
    . "<li><strong>Estado:</strong> " . htmlspecialchars($estado, ENT_QUOTES, "UTF-8") . "</li>"
    . "<li><strong>Tipo de Obra:</strong> " . htmlspecialchars($tipoObra, ENT_QUOTES, "UTF-8") . "</li>"
    . "</ul>"
    . "<p style=\"font-size: 0.85rem; color: #888;\">Recebido em " . date("d/m/Y \\à\\s H:i") . "</p>"
    . "</div></body></html>";

  $payload = [
    "from" => BMI9_RESEND_FROM,
    "to" => [BMI9_EMAIL_DESTINO],
    "subject" => $assunto,
    "html" => $corpo,
    "attachments" => [
      [
        "filename" => $pdfFilename,
        "content" => base64_encode($pdfBytes),
      ],
    ],
  ];

  if ($resend === "rest") {
    list($ok, $message) = send_resend_request($payload);
    if (!$ok) {
      error_log("[BMI9] Falha ao enviar e-mail via Resend REST: " . $message);
    }
    return [$ok, $message];
  }

  try {
    $resend->emails->send($payload);
    return [true, "ok"];
  } catch (Exception $e) {
    error_log("[BMI9] Falha ao enviar e-mail via Resend SDK: " . $e->getMessage());
    return [false, $e->getMessage()];
  }
}

function append_lead_csv($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem) {
  $filePath = __DIR__ . "/leads.csv";
  $fileExists = file_exists($filePath);
  $handle = @fopen($filePath, "a");
  if ($handle === false) {
    return false;
  }

  if (!$fileExists) {
    fputcsv($handle, ["Data", "Nome", "Telefone", "Cidade", "Estado", "Tipo de Obra", "Metragem", "Mensagem"]);
  }

  fputcsv($handle, [date("d/m/Y H:i:s"), $nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem]);
  fclose($handle);
  return true;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  header("Location: index.html#contato");
  exit;
}

$requestData = get_request_data();
$nome = sanitize(isset($requestData["nome"]) ? $requestData["nome"] : "");
$telefone = sanitize(isset($requestData["telefone"]) ? $requestData["telefone"] : "");
$cidade = sanitize(isset($requestData["cidade"]) ? $requestData["cidade"] : "");
$estado = strtoupper(sanitize(isset($requestData["estado"]) ? $requestData["estado"] : ""));
$tipoObra = sanitize(isset($requestData["tipo_obra"]) ? $requestData["tipo_obra"] : "");
$metragem = sanitize(isset($requestData["metragem"]) ? $requestData["metragem"] : "");
$mensagem = sanitize(isset($requestData["mensagem"]) ? $requestData["mensagem"] : "");

$errors = [];
if ($nome === "" || strlen($nome) < 2) {
  $errors[] = "Nome é obrigatório (mínimo 2 caracteres).";
}
if ($telefone === "" || !preg_match('/^[\d\s\-\+\(\)]{8,20}$/', $telefone)) {
  $errors[] = "Telefone inválido.";
}
$estadosValidos = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO"
];
if ($estado !== "" && !in_array($estado, $estadosValidos, true)) {
  $errors[] = "Estado inválido.";
}
$tiposObraValidos = ["Galpão Logístico", "Indústria", "Comercial", "Outro"];
if ($tipoObra !== "" && !in_array($tipoObra, $tiposObraValidos, true)) {
  $errors[] = "Tipo de obra inválido.";
}
if ($metragem !== "" && !is_numeric($metragem)) {
  $errors[] = "Metragem deve ser um número.";
}

if (!empty($errors)) {
  if (wants_json()) {
    json_response(400, ["ok" => false, "error" => implode(" ", $errors)]);
  }

  header("Location: index.html#contato");
  exit;
}

$pdfBytes = gerar_pdf_orcamento($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem);
$pdfFilename = build_pdf_filename($nome);
$whatsappUrl = build_whatsapp_url($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem);
$leadSalvo = append_lead_csv($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem);
list($emailEnviado, $emailStatus) = enviar_email_resend($nome, $telefone, $cidade, $estado, $tipoObra, $metragem, $mensagem, $pdfBytes, $pdfFilename);
$warnings = [];
if (!$leadSalvo) {
  $warnings[] = "Nao foi possivel salvar o lead no servidor.";
}
if (!$emailEnviado) {
  $warnings[] = "Falha no envio por e-mail: " . $emailStatus;
}

if (wants_json()) {
  $response = [
    "ok" => true,
    "message" => "Orçamento recebido com sucesso.",
    "whatsapp_url" => $whatsappUrl,
    "pdf_base64" => base64_encode($pdfBytes),
    "pdf_filename" => $pdfFilename,
  ];
  if (!empty($warnings)) {
    $response["warning"] = implode(" ", $warnings);
  }
  json_response(200, $response);
}

header("Location: {$whatsappUrl}");
exit;
?>
