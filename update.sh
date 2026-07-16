#!/usr/bin/env bash
set -euo pipefail

INPUT_FILE="fee-data.json"
DATA_DIR="data"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: $INPUT_FILE not found" >&2
  exit 1
fi

echo "Reading $INPUT_FILE ..."
STUDENTS=$(node -e "
  var fs = require('fs');
  var d = JSON.parse(fs.readFileSync('$INPUT_FILE','utf8'));
  if (!d.students || !d.students.length) { console.error('No students'); process.exit(1); }
  fs.writeFileSync('$DATA_DIR/students.json', JSON.stringify(d.students), 'utf8');
  console.log(d.students.length + ' students');
")

echo "  $STUDENTS"

# ---- generate dashboard.json ----
node -e "
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('$INPUT_FILE','utf8'));
var s = data.students;

var depts = {}, courses = {}, cats = {}, genders = {};
var sessions = {}, deptFee = {};
var totalBal = 0;

s.forEach(function(stu){
  depts[stu.dept] = true;
  courses[stu.course] = true;
  cats[stu.category] = true;
  genders[stu.gender] = true;

  var roll = String(stu.roll);
  var match = roll.match(/^(\d{2})/);
  if (match) {
    var p = match[1];
    var session = p === '26' ? '2026-27' : p === '25' ? '2025-26' : p === '24' ? '2024-25' : p === '23' ? '2023-24' : '20'+p+'-'+(Number(p)+1);
    sessions[session] = (sessions[session] || 0) + 1;
  }

  var bal = Number(stu.balance) || 0;
  if (bal > 0) totalBal += bal;

  if (!deptFee[stu.dept]) deptFee[stu.dept] = { amount: 0, count: 0 };
  if (bal > 0) { deptFee[stu.dept].amount += bal; deptFee[stu.dept].count++; }
});

var sessionOrder = {};
Object.keys(sessions).sort().forEach(function(k){ sessionOrder[k] = sessions[k]; });

var feeOrder = {};
Object.keys(deptFee).sort().forEach(function(k){
  feeOrder[k] = { amount: Math.round(deptFee[k].amount), count: deptFee[k].count };
});

var dash = {
  totalStudents: s.length,
  totalBalance:  Math.round(totalBal),
  departments:   Object.keys(depts).sort(),
  courses:       Object.keys(courses).sort(),
  categories:    Object.keys(cats).sort(),
  genders:       Object.keys(genders).sort(),
  sessionCounts: sessionOrder,
  deptFeeData:   feeOrder
};

fs.writeFileSync('$DATA_DIR/dashboard.json', JSON.stringify(dash, null, 2), 'utf8');
console.log('  dashboard.json written');
"

# ---- generate JS wrappers for file:// fallback ----
echo "  Writing students.js ..."
node -e "
var fs = require('fs');
var json = fs.readFileSync('$DATA_DIR/students.json','utf8');
fs.writeFileSync('$DATA_DIR/students.js', 'window.__DATA__=window.__DATA__||{};window.__DATA__.students=' + json, 'utf8');
"

echo "  Writing dashboard.js ..."
node -e "
var fs = require('fs');
var json = fs.readFileSync('$DATA_DIR/dashboard.json','utf8');
fs.writeFileSync('$DATA_DIR/dashboard.js', 'window.__DATA__=window.__DATA__||{};window.__DATA__.dashboard=' + json, 'utf8');
"

S1=$(wc -c < "$DATA_DIR/students.json" | tr -d ' ')
S2=$(wc -c < "$DATA_DIR/dashboard.json" | tr -d ' ')
S3=$(wc -c < "$DATA_DIR/students.js" | tr -d ' ')
S4=$(wc -c < "$DATA_DIR/dashboard.js" | tr -d ' ')

echo ""
echo "Done – all derived files regenerated from $INPUT_FILE"
printf "  %-20s %s bytes\n" "students.json"  "$S1"
printf "  %-20s %s bytes\n" "dashboard.json"  "$S2"
printf "  %-20s %s bytes\n" "students.js"     "$S3"
printf "  %-20s %s bytes\n" "dashboard.js"    "$S4"
