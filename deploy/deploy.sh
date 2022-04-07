#!/bin/bash

rsync -acvz $(pwd)/dist/kmc-reacji.js ec2-user@miyama:/home/ec2-user/.local/bin/kmc-reacji/kmc-reacji.js

# サーバー再起動
ssh ec2-user@miyama "kill $(ssh ec2-user@miyama "ps aux | grep kmc-reacji" | grep node | awk '{ print $2 }')"
timeout 3 ssh ec2-user@miyama "nohup node ~/.local/bin/kmc-reacji/kmc-reacji.js &" || exit 0
