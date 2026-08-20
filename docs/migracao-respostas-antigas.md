# Migração do formulário antigo (Google Forms) → aba `Respostas_Antigas`

> Executada em 2026-08-18/20. Script rodou uma única vez, via função temporária
> no Apps Script (já removida do código-fonte — ver `appscript/codigo.js`
> histórico no git). Este documento registra os critérios usados, para o caso
> de a aba precisar ser regenerada ou auditada no futuro.

## Origem

Planilha "Pesquisa de satisfação dos usuários PACIENTES - Caucaia (respostas)"
(Google Forms), ID `1CMJ6MmdECcjRhSlogqlZ0yy14J2N5GG-wBsiEUfBX50`, aba
"Respostas ao formulário 1". Proprietário: `mktinstitutosaovicente@gmail.com`.

Colunas originais (8 perguntas, ver `docs/Comparativo-Pesquisa-Satisfacao.pdf`):
`Carimbo de data/hora, Unidade, Recepção (1-5), Enfermagem (1-5), Médico (1-5),
Serviço Social (1-5, opcional), Higiene/Limpeza (1-5), Satisfação geral (0-10),
Sugestões/críticas (texto)`.

## Destino

Aba `Respostas_Antigas` na planilha de produção (`1b-QuMPD99jZm36JqC3A1tSzhkAaRfjKPvhqalnw_jmw`),
schema `HEADERS_ANTIGAS` em `appscript/codigo.js`:
`ID, Timestamp, Municipio, Unidade, NPS, Recepcao, Enfermagem, Atendimento, ServicoSocial, Limpeza, Comentario`

## Mapeamento de campos

| Campo antigo | Campo novo |
|---|---|
| Satisfação geral (0-10) | `NPS` |
| Acolhimento da Recepção | `Recepcao` |
| Acolhimento da Enfermagem | `Enfermagem` |
| Acolhimento do Médico | `Atendimento` |
| Acolhimento do Serviço Social | `ServicoSocial` |
| Higiene/Limpeza | `Limpeza` |
| Sugestões/críticas | `Comentario` |
| — | `Espera` fica sempre vazio (pergunta não existia no formulário antigo) |
| — | `Municipio` = `"Caucaia"` fixo (única cidade no formulário antigo) |

## Mapeamento de unidade

| Nome na planilha antiga | Unidade migrada |
|---|---|
| `Hospital Municipal de Caucaia Abelardo Gadelha da Rocha` | `Hospital Municipal Abelardo Gadelha` |
| `UPA Centro` | `UPA Luiz Nerys` (confirmado com o usuário: mesma unidade renomeada) |
| `UPA Jurema` | `UPA Jurema` (sem alteração) |
| `Hospital Maternidade Santa Terezinha` | `Maternidade Santa Terezinha` |

## Linhas excluídas

**14 respostas** excluídas: unidade "Hospital Municipal Abelardo Gadelha",
timestamp entre `2026-08-06T16:20:00.000Z` e `2026-08-06T16:55:00.000Z`.
Motivo: cluster concentrado num intervalo de ~30 min, coincidindo com a
janela de ativação/teste do tablet PWA naquela unidade — suspeita de
duplicata com respostas já capturadas pelo sistema novo na mesma janela
(confirmado por cruzamento de timestamp com a base nova, janela de 15 min).

## Geração de ID

`ID = timestamp original em epoch ms` (não `Date.now()` do momento da
migração). Em caso de colisão (mesmo segundo exato — 20 grupos encontrados
na base original), incrementa 1ms até desempatar. Isso garante que os IDs
migrados nunca colidem com IDs de respostas reais novas (que só existem a
partir de 2026-06-12 e usam `Date.now()` do momento do envio).

## Resultado

19.861 linhas na origem → **19.847 migradas** (14 excluídas conforme acima).
Período: 17/08/2025 14:42 a 18/08/2026 09:27 (horário de Fortaleza, UTC-3).

## Como reproduzir

O script original (Node.js, parsing do CSV exportado + geração dos batches
enviados via endpoint temporário no Apps Script) não foi versionado — só
existe no histórico da sessão em que foi executado. Se precisar refazer,
os critérios acima são suficientes para reescrever a lógica do zero; o mais
importante é preservar exatamente os 4 mapeamentos de unidade e a janela de
exclusão documentados aqui, para não gerar um resultado diferente do que já
está publicado no dashboard.
