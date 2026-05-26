# Chat Emma 🇻🇪

Un chat de Inteligencia Artificial al estilo venezolano, creado para ofrecer una experiencia cercana, coloquial y amigable. "Chat Emma" simula ser un "pana" virtual que entiende el contexto y la forma de hablar de Venezuela. Desarrollado con Next.js, React y Tailwind CSS, ofreciendo una interfaz rápida, responsiva y moderna.

## Características

- 🇻🇪 **Personalidad venezolana**: Respuestas ajustadas para sonar como un amigo ("tu pana de IA").
- 💾 **Persistencia de mensajes**: El historial de chat se guarda automáticamente en el almacenamiento local del navegador (`localStorage`), para que no pierdas tu conversación si recargas la página.
- 📜 **Soporte para Markdown**: El chat puede renderizar texto enriquecido (negritas, cursivas, listas, código, etc.) usando `react-markdown`.
- 💬 **Interfaz intuitiva y responsiva**: Un diseño limpio con un área de texto que crece automáticamente a medida que escribes (auto-resize).
- ⚡ **Respuestas en Streaming**: Los mensajes de la inteligencia artificial se muestran palabra por palabra en tiempo real (Server-Sent Events), mejorando la percepción de velocidad.
- 🎨 **Diseño adaptativo y oscuro**: Construido con Tailwind CSS, adaptado especialmente a pantallas móviles y de escritorio.
- 🔄 **Ventana de contexto inteligente**: Envía solo los mensajes más recientes a la API para ahorrar tokens y mantener la fluidez de la conversación.

## Tecnologías Utilizadas

- **[Next.js 15+](https://nextjs.org/)**: Framework de React para aplicaciones web.
- **[React 19](https://react.dev/)**: Biblioteca para interfaces de usuario.
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Framework CSS de utilidad.
- **[React Markdown](https://github.com/remarkjs/react-markdown)**: Renderizado de markdown en los mensajes.
- **TypeScript**: Tipado estático.
