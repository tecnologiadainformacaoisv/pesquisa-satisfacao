# QR codes — acesso direto à pesquisa (unidades sem tablet)

Gerados em 2026-10-14 pra 3 unidades sem tablet físico, que vão usar o celular
do próprio paciente. Usam o suporte a `?municipio=&unidade=` adicionado em
`pesquisa.html` na v1.1.48 (ver CHANGELOG.md) — abre direto no formulário,
sem passar pelo overlay de configuração.

| Arquivo | Município | Unidade | URL |
|---|---|---|---|
| `tabuleiro-do-norte-ana-rita.png` | Tabuleiro do Norte | Ana Rita Bezerra Maia Moreira | `pesquisa.html?municipio=Tabuleiro%20do%20Norte&unidade=Ana%20Rita%20Bezerra%20Maia%20Moreira` |
| `maracanau-hospital-da-mulher.png` | Maracanaú | Hospital da Mulher e da Criança Eneida Soares Pessoa | `pesquisa.html?municipio=Maracana%C3%BA&unidade=Hospital%20da%20Mulher%20e%20da%20Crian%C3%A7a%20Eneida%20Soares%20Pessoa` |
| `maracanau-24hrs.png` | Maracanaú | Unidade de Atendimento 24hrs | `pesquisa.html?municipio=Maracana%C3%BA&unidade=Unidade%20de%20Atendimento%2024hrs` |

Município/unidade são validados contra a aba Equipamentos ao abrir (ver
`aplicarConfigDaUrlSeHouver()` em `pesquisa.html`) — se o nome aqui divergir
do que está na planilha (ex: unidade renomeada/desativada), o QR deixa de
funcionar e cai no overlay de configuração normal, sem erro visível.

Se precisar gerar mais QR codes (outras unidades), o padrão de URL é:
```
https://tecnologiadainformacaoisv.github.io/pesquisa-satisfacao/pesquisa.html?municipio=<município exato da aba Equipamentos>&unidade=<unidade exata>
```
(URL-encoded; nomes com acento/espaço precisam de encoding correto).
