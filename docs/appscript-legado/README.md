# Scripts de migração já executados (arquivados)

Scripts "rode 1x" do Apps Script, já executados em produção, movidos pra cá
em 2026-09-14 pra sair da pasta `appscript/` — como o `clasp push --force`
(`appscript/deploy.ps1`) reenvia tudo que está em `appscript/` pro projeto
Apps Script em produção a cada deploy, esses arquivos só poluíam o projeto
sem nenhuma função em uso (nada em `codigo.js` depende deles). Ficam aqui só
como referência histórica de como cada migração/atualização de cadastro foi
feita, caso precise ser auditada ou repetida.

- `expansaoEquipamentos.js` — Fase 2, Etapa 1 (cadastro inicial de 37 unidades novas)
- `expansaoEquipamentosFase2b.js` — Fase 2b (mais 114 unidades)
- `atualizacaoSetembro10.js` — atualização Set/2026 (Orós/Guaraciaba desativados, Massapé renomeado)
- `limpezaTestes.js` — remoção de linhas de teste (QA_TESTE etc.) das abas de produção

`sincronizacaoLegado.js` **não** está aqui — continua em `appscript/` de
propósito porque `codigo.js` (`doPostInterno`/`doPostColaborador`/
`getDadosGenerico_`) depende de constantes e funções definidas nele
(`SHEET_INTERNOS`, `HEADERS_INTERNOS`, `getOrCreateSheetGenerico_` etc.).
Ver `CLAUDE.md` pro contexto completo da Fase 2.
