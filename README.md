# CafeOps · Coffee Operating System

> Un marco abierto para la transformación técnica, económica y humana del sector cafetero mundial.

Este repositorio contiene el manuscrito completo de **CafeOps** publicado por **Cafelium Foundation** en formato Markdown y un sitio web estático de alto impacto visual con lectura en voz alta integrada.

- `manuscript.md` — manuscrito en Markdown
- `index.html` — sitio web estático
- `assets/` — hojas de estilo, JavaScript y librería `marked`

## Lectura en voz alta

El sitio utiliza la API `speechSynthesis` del navegador. Selecciona una voz en español desde el reproductor inferior y presiona **▶**. Atajos de teclado:

- `Espacio` — reproducir / pausar
- `Escape` — detener
- `←` / `→` — retroceder / avanzar frase

## GitHub Pages

El sitio se despliega automáticamente a GitHub Pages con el workflow en `.github/workflows/pages.yml`. Para activarlo:

1. Ve a **Settings → Pages** en el repo.
2. En **Build and deployment → Source** elige **GitHub Actions**.
3. Empuja cualquier cambio a `main` o ejecuta el workflow manualmente.

La URL será `https://nhilson73.github.io/CafeOps/`.

## Desarrollo local

No requiere build. Sirve la carpeta raíz con cualquier servidor estático:

```bash
python3 -m http.server 8080
```

Luego abre http://localhost:8080.

## Licencia

El contenido editorial se publica bajo **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.
Las marcas CafeOps, FermentOps, TraceOps, RoastOps y Digital Terroir son propiedad de Cafelium Foundation.
