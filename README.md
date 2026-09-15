# BMI9.LOL — Plataforma Web Institucional & Sistema de Orçamentos

[![Status](https://img.shields.io/badge/Status-Produção%20%7C%20Portfólio-brightgreen)](#observação-sobre-portfólio)
[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JS%20%7C%20Python%20%7C%20PHP-blue)](#tecnologias-utilizadas)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20Serverless-black?logo=vercel)](#deploy)
[![License](https://img.shields.io/badge/Licença-Proprietária%20(Portfólio)-lightgrey)](#observação-sobre-portfólio)

> Website institucional e aplicação de captação de leads com gerador dinâmico de propostas em PDF, sistema transacional de e-mails resiliente e internacionalização nativa. Desenvolvido para uma empresa real atuante no setor de construção civil e pisos industriais de alta performance, e publicado neste repositório sob autorização prévia para fins de exibição e demonstração técnica de portfólio.

---

## 📑 Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Destaques Técnicos e Arquitetura](#destaques-técnicos-e-arquitetura)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Segurança e Boas Práticas](#segurança-e-boas-práticas)
- [Como Executar Localmente](#como-executar-localmente)
- [Deploy](#deploy)
- [Observação sobre Portfólio](#observação-sobre-portfólio)

---

## Sobre o Projeto

O **BMI9.LOL** foi concebido para atender às demandas de apresentação técnica e conversão de vendas de uma empreiteira especializada em pisos industriais monolíticos, concreto polido e revestimentos de alta resistência mecânica (galpões logísticos, plantas industriais e edifícios comerciais).

O objetivo central foi unir **alta performance de carregamento (Lighthouse 95+)**, **estética visual contemporânea (dark theme industrial com microinterações fluidas)** e um **fluxo automatizado de pré-vendas**, no qual o cliente preenche os parâmetros da obra, recebe instantaneamente um arquivo PDF executivo e os dados são disparados para a equipe comercial via múltiplos canais redundantes (WhatsApp, Resend API e SMTP).

---

## Destaques Técnicos e Arquitetura

1. **Frontend Vanilla Ultra-Rápido**:
   - Zero frameworks pesados no cliente, resultando em First Contentful Paint (FCP) quase instantâneo.
   - Design System customizado em Vanilla CSS com suporte a variáveis, tipografia moderna (Google Fonts) e responsividade fluida para mobile, tablet e desktop.
   - Animações refinadas via Intersection Observer e aceleração por GPU (`transform`, `opacity`).
2. **Mecanismo Próprio de Geração de PDFs Vetorizados**:
   - Geração de propostas executivas no backend diretamente em stream binário, com parsing de chunks PNG para incorporação de logotipos de alta resolução, dispensando bibliotecas pesadas de terceiros e rodando em milissegundos dentro de ambientes Serverless com limite rígido de memória.
3. **Resiliência e Failover de Entrega**:
   - Envio de notificações com fallback automático: primário via **Resend API** (HTTP/REST); caso indisponível, fallback automático para **SMTP/Gmail (com TLS/SSL)**.
   - Roteamento híbrido: arquitetura orientada a microsserviço Serverless em **Python (Flask)** na Vercel, mantendo compatibilidade legada através de endpoint alternativo em **PHP**.
4. **Sistema de Feedback e Engajamento Interativo**:
   - Avaliações e contadores de curtidas nas páginas de projetos, com suporte a persistência híbrida: **Redis / Vercel KV REST API**, fallback em memória e armazenamento local com sanitização contra injeção de scripts (XSS).
5. **Internacionalização Nativa (i18n)**:
   - Suporte bilíngue completo (**Português do Brasil `pt-BR`** e **Inglês `en-US`**) com alternância em tempo real e persistência da preferência do usuário via `localStorage`.

---

## Funcionalidades

- **Apresentação de Serviços e Portfólio**:
  - Catálogo detalhado de soluções (Pisos Monolíticos, Concreto Polido, Tratamento de Juntas e Regularização).
  - Páginas dedicadas para obras realizadas (Concessionária Honda, Creches e Parques, Galpões Logísticos, Indústrias Pesadas).
  - Carrossel infinito de fotos de projetos e logos de parceiros/clientes corporativos (Mercado Livre, Honda, HB Fuller, etc.).
- **Calculadora e Formulário de Orçamento**:
  - Validação estrita no cliente e no servidor para nomes, telefones brasileiros com máscara, seleção de estados e metragens.
  - Sanitização de inputs contra XSS e Header Injection.
  - Geração imediata de orçamento formal em PDF com número de protocolo e timestamp.
  - Redirecionamento inteligente para atendimento direto via WhatsApp com mensagem pré-formatada.
- **Área Administrativa Segura**:
  - Endpoint `GET /admin/leads` protegido por autenticação via Bearer Token para exportação e triagem de leads recebidos.
- **Acessibilidade e SEO**:
  - Marcação estruturada Schema.org (`LocalBusiness`), tags OpenGraph completas, navegação com suporte a leitores de tela (atributos ARIA) e boas práticas de semântica HTML5.

---

## Tecnologias Utilizadas

Este projeto foi construído exclusivamente com tecnologias comprovadas e nativas:

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | HTML5 Semântico, CSS3 Moderno (Custom Properties, Flexbox, Grid), JavaScript Vanilla (ES6+, Fetch API, Canvas API, Web Storage) |
| **Backend Principal** | Python 3.10+, Flask, Resend Python SDK, Redis SDK, Smtplib/SSL |
| **Backend Legado / Alternativo** | PHP 8+, Resend PHP SDK (Composer) |
| **Armazenamento & Cache** | Redis / Vercel KV REST API, CSV formatado (`leads.csv`) |
| **Deploy & Infraestrutura** | Vercel (Serverless Functions, Rewrites, Edge Caching) |
| **Qualidade & Segurança** | Rate Limiting por IP, Content-Security-Policy (CSP), HSTS, X-Frame-Options, Sanitização LGPD |

---

## Estrutura do Projeto

```text
bmi9.lol/
├── api/
│   └── index.py             # Microserviço Flask (rotas REST, geração de PDF, envio de e-mails e admin)
├── assets/                  # Imagens de projetos, ícones e logotipos otimizados
├── i18n/
│   ├── en-US.json           # Dicionário de tradução para Inglês
│   └── pt-BR.json           # Dicionário de tradução para Português
├── index.html               # Página inicial (Hero, serviços, parcerias, portfólio, orçamento)
├── sobre.html               # Página institucional sobre a empresa, missão e equipe técnica
├── obra-comercial.html      # Estudo de caso: piso e parede marmorizados
├── obra-galpao.html         # Estudo de caso: piso monolítico em creche
├── obra-honda.html          # Estudo de caso: pintura epóxi em oficina de concessionária
├── obra-industria.html      # Estudo de caso: piso epóxi industrial de alto tráfego
├── build_projetos.js        # Script utilitário em Node para sincronização de templates de projetos
├── build_projetos.py        # Script utilitário em Python para sincronização de templates de projetos
├── composer.json            # Manifesto de dependências PHP (Resend SDK)
├── contato.php              # Endpoint PHP alternativo para hospedagens convencionais
├── i18n.js                  # Engine de internacionalização no cliente
├── leads.csv                # Armazenamento local de demonstração de leads recebidos
├── overlay.css              # Estilos do modal e overlay interativo
├── projetos.json            # Base de dados estruturada dos projetos e metadados de mídia
├── requirements.txt         # Dependências Python para execução local e deploy no Vercel
├── run.bat                  # Script de inicialização automática no Windows (ambiente virtual + Flask)
├── run.ps1                  # Script PowerShell de inicialização com verificação de ambiente
├── script.js                # Lógica de interface, validações, carrosséis, likes e submissão
├── styles.css               # Folha de estilo principal com o Design System completo
└── vercel.json              # Configuração de roteamento Serverless e rewrites da Vercel
```

---

## Segurança e Boas Práticas

- **Proteção de Dados Pessoais (LGPD)**: Todas as informações de clientes e formulários de teste presentes neste repositório utilizam **dados puramente fictícios**.
- **Gestão de Segredos**: Credenciais, chaves de API e senhas transacionais são estritamente gerenciadas por meio de variáveis de ambiente (`.env`), com regras no `.gitignore` que impedem qualquer exposição acidental.
- **Cabeçalhos HTTP de Segurança**: O microserviço emite cabeçalhos recomendados pelo OWASP:
  - `Content-Security-Policy (CSP)`
  - `Strict-Transport-Security (HSTS)`
  - `X-Frame-Options: DENY` (prevenção contra Clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Rate Limiting**: Controle de taxa de requisições baseado no IP do cliente para prevenir abusos no formulário e no endpoint de orçamento.

---

## Como Executar Localmente

### Pré-requisitos
- **Python 3.10+** (recomendado para a API completa)
- Ou qualquer servidor estático local (Live Server no VS Code, `npx serve`, etc.) para visualização apenas do frontend.

### Executando no Windows (Modo Automatizado)

O repositório inclui scripts prontos que configuram o ambiente virtual, instalam as dependências do `requirements.txt` e iniciam a API Flask:

1. Dê duplo clique no arquivo **`run.bat`**  
   *ou abra o terminal e execute:*
   ```cmd
   run.bat
   ```
2. Ou via PowerShell:
   ```powershell
   .\run.ps1
   ```
3. Acesse no navegador:
   ```text
   http://127.0.0.1:5000
   ```

### Executando Manualmente (Linux / macOS / Windows)

1. Clone o repositório:
   ```bash
   git clone https://github.com/s4muelxl/bmi9.lol.git
   cd bmi9.lol
   ```
2. Crie e ative um ambiente virtual:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env conforme necessário
   ```
5. Inicie o servidor:
   ```bash
   python api/index.py
   ```
6. Abra `http://127.0.0.1:5000` no seu navegador.

---

## Deploy

O projeto está totalmente preparado para implantação com zero configuração na plataforma **Vercel**:

1. Conecte o repositório ao dashboard da [Vercel](https://vercel.com).
2. O arquivo `vercel.json` encaminha automaticamente as rotas `/api/*`, `/contato.php` e `/admin/leads` para a Serverless Function Python em `api/index.py`.
3. Configure as seguintes variáveis de ambiente no painel da Vercel:
   - `BMI9_ADMIN_TOKEN`: Token seguro para a rota administrativa.
   - `BMI9_EMAIL_DESTINO`: E-mail de destino das notificações.
   - `RESEND_API_KEY`: Chave da API Resend (se utilizar envio transacional via Resend).
   - `RESEND_FROM`: Remetente de domínio verificado (ex.: `orcamentos@seudominio.com`).
   - `SMTP_USER` / `SMTP_PASS`: Credenciais SMTP (caso utilize fallback do Gmail).

---

## Observação sobre Portfólio

Este projeto foi originalmente desenvolvido para um cliente corporativo real do ramo de construção civil e revestimentos industriais.

- **Autorização de Publicação**: O código-fonte foi publicado com a devida anuência para fins de composição de portfólio profissional de engenharia de software e desenvolvimento web.
- **Anonimização**: Todos os números de telefone, mensagens e contatos presentes nos arquivos de demonstração e no código-fonte são **completamente fictícios** para assegurar conformidade integral com a LGPD e proteger a privacidade do cliente e de seus parceiros.
