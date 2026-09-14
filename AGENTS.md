# Harbor Site delivery

- The root `.openai/hosting.json` identifies the public Harbor Site for the main game and `club/`. Reuse its exact project ID for Sites work.
- Use `npm run site:prepare` to assemble `dist/` from current source. The builder preserves the checked-in single-file offline releases and applies the public cross-game navigation only to `dist/`.
- For requested Site changes, follow the Sites skills and publish to the same public URL unless the user explicitly requests local-only work. Merely editing files or pushing Git is not a completed deployment.
- `research/web-game-engines` owns a separate Site. Do not package or change that Site as part of Harbor deployment.
- Keep credentials out of source, files, Git configuration and logs. Retain the existing LLM provider policy if LLM functionality is introduced.
