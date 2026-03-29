# YTView - YouTube Picture-in-Picture

O YTView é um aplicativo para macOS que permite assistir vídeos do YouTube em uma janela flutuante que fica sempre visível sobre outras janelas. Perfeito para assistir vídeos enquanto trabalha ou usa outros aplicativos.

## O que o YTView faz?

O YTView cria uma janela compacta e minimalista que reproduz vídeos do YouTube. Esta janela fica sempre no topo, então você pode assistir seus vídeos enquanto usa outros aplicativos sem precisar alternar entre janelas.

## Características

- 🎥 **Reprodução de vídeos do YouTube** - Assista qualquer vídeo do YouTube
- 📌 **Janela sempre no topo** - A janela fica visível sobre todas as outras aplicações
- 🎨 **Interface minimalista** - Sem distrações, apenas o vídeo
- 🖱️ **Fácil de usar** - Clique no vídeo para trocar de vídeo
- ⌨️ **Atalhos de teclado** - Controle rápido com atalhos globais
- 💾 **Lembra o último vídeo** - O aplicativo lembra qual vídeo você estava assistindo

## Como usar

1. **Abrir o aplicativo** - Ao iniciar, você verá um campo para inserir o vídeo
2. **Inserir um vídeo** - Cole a URL completa do YouTube (ex: `https://www.youtube.com/watch?v=VIDEO_ID`) ou apenas o ID do vídeo
3. **Confirmar** - Pressione Enter ou clique em OK
4. **Assistir** - O vídeo será carregado e você pode assistir normalmente
5. **Trocar de vídeo** - Clique em qualquer lugar do vídeo para abrir o campo de entrada novamente e inserir um novo vídeo

## Atalhos de teclado

- **Cmd+Shift+Y**: Abrir ou focar a janela do YTView
- **Cmd+Q**: Sair do aplicativo
- **Cmd+W**: Fechar a janela

## Requisitos

- macOS (versão compatível com Electron)
- Node.js (versão 18 ou superior)
- npm

## Baixar

Acesse a página de [Releases](../../releases) do projeto e baixe o arquivo `.dmg` mais recente para macOS. Abra o `.dmg` e arraste o YTView para a pasta **Aplicativos**.

> **Nota:** Como o app não é assinado pela Apple, no primeiro uso o macOS pode bloquear a abertura. Vá em **Ajustes do Sistema > Privacidade e Segurança** e clique em "Abrir mesmo assim".

## Desenvolvimento

Este projeto usa um monorepo com [pnpm workspaces](https://pnpm.io/workspaces) e [Turborepo](https://turbo.build/).

### Instalar dependências

```bash
pnpm install
```

### Rodar em modo de desenvolvimento

```bash
pnpm turbo run build --filter=@ytview/youtube-utils
cd apps/desktop && npm run electron:dev
```

### Buildar o aplicativo (.app / .dmg)

```bash
pnpm turbo run build
cd apps/desktop && npm run electron:build
```

O `.dmg` será gerado em `apps/desktop/dist/`.
