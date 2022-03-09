# 📯 kmc-reacji

[![Lint](https://github.com/kmc-jp/kmc-reacji/actions/workflows/main.yml/badge.svg)](https://github.com/kmc-jp/kmc-reacji/actions/workflows/main.yml)

## 📚 概要

登録された部員のSlackメッセージを指定のチャンネルに転送する。
転送条件は以下
- 特定のリアクションを押すこと
- そのリアクションが本人のものであること
- リアクションが付けられた投稿が本人のものであること
- KMC-REACJI に登録されていること

## 🔨 登録方法

`src/transfer-rule.ts` に、IDと転送先のチャンネルIDを書き込む
