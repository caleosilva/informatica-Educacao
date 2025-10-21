# Projeto de Stream de Câmera (WebRTC)

Este projeto permite transmitir o vídeo da câmera de um dispositivo (como um celular) e exibi-lo em outro dispositivo (como um PC conectado a um monitor) usando WebRTC e um servidor de sinalização Node.js.

O `ngrok` é utilizado para expor o servidor de sinalização local à internet, permitindo que dispositivos em redes diferentes (ou que necessitam de HTTPS) possam se conectar.

## Pré-requisitos

* [Node.js](https://nodejs.org/) instalado.
* Uma conta gratuita no [ngrok](https://ngrok.com/).

## Passo a Passo para Execução

Siga estas etapas para configurar e executar o sistema.

### 1. Preparar o Servidor (Broker)

Primeiro, inicie o servidor de sinalização local (o "broker").

1.  Abra um terminal na pasta do projeto.
2.  Instale as dependências (caso seja a primeira vez):
    ```bash
    npm install
    ```
3.  Inicie o servidor:
    ```bash
    node server.js
    ```
    O servidor estará rodando localmente na `porta 3000`. Deixe este terminal aberto.

### 2. Configurar o `ngrok`

Para que seu celular possa acessar o servidor que está no seu PC, usaremos o `ngrok` para criar um túnel público e seguro (HTTPS).

1.  **Instale o `ngrok`** (Exemplo para Linux):
    ```bash
    sudo snap install ngrok
    ```
    *(Para Windows ou Mac, baixe o executável no [site oficial](https://ngrok.com/download)).*

2.  **Crie sua conta:**
    Acesse [https://ngrok.com/](https://ngrok.com/) e faça seu cadastro.

3.  **Configure seu token de autenticação:**
    Após o cadastro, o site fornecerá um token de autenticação. Copie-o e execute no seu terminal:
    ```bash
    ngrok config add-authtoken <seu_token_aqui>
    ```
    *(Você só precisa fazer isso uma vez).*

### 3. Iniciar o Túnel `ngrok`

Em um **segundo terminal** (deixe o `server.js` rodando no primeiro), inicie o túnel `ngrok` apontando para a porta do seu servidor.

1.  Execute o comando:
    ```bash
    ngrok http 3000
    ```
2.  O `ngrok` exibirá uma tela de status. Procure pela linha **"Forwarding"** que começa com `httpsS`:
    ```
    Forwarding      [https://tearily-sackclothed-bryce.ngrok-free.dev](https://tearily-sackclothed-bryce.ngrok-free.dev) -> http://localhost:3000
    ```
    Esta URL (`httpsS://...`) é o seu novo endereço público.

### 4. Executar a Aplicação

Agora, use o URL fornecido pelo `ngrok` para acessar a aplicação nos dois dispositivos.

1.  **Copie o URL** (`httpsS://...ngrok-free.dev`).
2.  Abra este URL no navegador do seu **PC/Monitor**.
3.  Abra este MESMO URL no navegador do seu **Celular**.

**Ordem de execução (Importante):**

1.  Primeiro, no **PC**, clique no botão:
    **"2. Assistir Stream (PC/Monitor)"**

2.  Em seguida, no **Celular**, clique no botão:
    **"1. Iniciar Stream (Celular)"**
