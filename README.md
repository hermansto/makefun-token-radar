# hermansto/makefun-token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/hermansto/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard)
[![reward](https://make.fun/badge/token-radar-01/hermansto/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

Every protocol in a sealed DefiLlama snapshot that records no token, priced from its own TVL, seven-day growth and track record, ranked by what its token would be worth, each row with the steps to farm it before the token exists. The value model is transparent: TVL times a category multiple (what tokenised peers of that business trade at per dollar of TVL) times growth, maturity, chain breadth and scale multipliers, all shown on the page.

## Run it

mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json

MIT licensed.
