#!/usr/bin/env bash
set -euo pipefail

INPUT_FILE="fee-data.json"
DATA_DIR="data"
OUTPUT_FILE="$DATA_DIR/data.js"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: $INPUT_FILE not found" >&2
  exit 1
fi

echo "Reading $INPUT_FILE ..."

node -e "
var fs = require('fs');
var raw = fs.readFileSync('$INPUT_FILE','utf8');
var d = JSON.parse(raw);
if (!d.students || !d.students.length) {
  console.error('No students found in ' + '$INPUT_FILE');
  process.exit(1);
}
var s = d.students;
console.log(s.length + ' students found');

var out = 'window.__DATA__=window.__DATA__||{};window.__DATA__.students=' + JSON.stringify(s) + ';';
fs.writeFileSync('$OUTPUT_FILE', out, 'utf8');
"

S1=$(wc -c < "$INPUT_FILE" | tr -d ' ')
S2=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')

echo ""
echo "Done – all data generated from $INPUT_FILE"
printf "  %-20s %s bytes\n" "fee-data.json"   "$S1"
printf "  %-20s %s bytes\n" "data.js"     "$S2"
