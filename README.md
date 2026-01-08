# YTView - YouTube Picture-in-Picture

Aplicativo Electron minimalista para macOS que reproduz vídeos do YouTube em uma janela sempre no topo, sem barra de ferramentas.

## Características

- 🎥 Reprodução de vídeos do YouTube
- 📌 Janela sempre no topo (always-on-top)
- 🎨 Interface minimalista sem barra de ferramentas
- 🖱️ Clique no vídeo para trocar
- ⌨️ Atalhos globais (Cmd+Shift+Y)
- 💾 Persistência do último vídeo

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Em outro terminal, executar Electron
npm run electron:dev

# Build para produção
npm run electron:build
```

## Uso

1. Clique no vídeo para abrir o input
2. Cole uma URL do YouTube ou apenas o ID do vídeo
3. Pressione Enter ou clique em OK
4. O vídeo será carregado automaticamente

## Atalhos

- `Cmd+Shift+Y`: Abrir/focar janela
- `Cmd+Q`: Sair do aplicativo
- `Cmd+W`: Fechar janela
