#!/usr/bin/env node
/**
 * Generates data/teachers.js from:
 *   - Teacher.csv   (credentials)
 *   - TimeTable.json (class allocations per teacher)
 *   - data/data.js  (student class list, for validation)
 *
 * Usage: node scripts/generate-teachers.js
 * Run from the project root.
 */
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, s) { fs.writeFileSync(path.join(ROOT, p), s, 'utf8'); }

function norm(s) {
  return String(s || '').replace(/\s+/g, '').toLowerCase();
}

/* ── Timetable program name -> student class(es) (dept, course) ── */
var CLASS_MAP = {
  'B.Sc (CS\\Eco)-I': [['Science', 'B.Sc (CS)-I Sem.'], ['Science', 'B.Sc (Eco)-I Sem.']],
  'B.Sc (CS\\Eco)-III': [['Science', 'B.Sc (CS)-III Sem.'], ['Science', 'B.Sc (Eco)-III Sem.']],
  'B.Sc (CS\\Eco)-V': [['Science', 'B.Sc (CS)-V Sem.'], ['Science', 'B.Sc (Eco)-V Sem.']],
  'B.Voc. (SD)-I': [['Computer', 'B.Voc (SD) - I Sem']],
  'B.Voc. (SD)-III': [['Computer', 'B.Voc (SD) - III Sem']],
  'B.Voc. (SD)-V': [['Computer', 'B.Voc (SD) - V Sem']],
  'BA-I(CA)': [['Arts', 'BA Sem 1']],
  'BA-I(OM)': [['Arts', 'BA Sem 1']],
  'BA-III(CA)': [['Arts', 'BA Sem 3']],
  'BA-V(CA)': [['Arts', 'BA Sem 5']],
  'BAJMC Semester-I': [['Arts', 'BJMC Sem 1']],
  'BAJMC Semester-III': [['Arts', 'BJMC Sem 3']],
  'BAJMC Semester-V': [['Arts', 'BJMC Sem 5']],
  'BBA-I': [['Commerce', 'BBA-I Semester']],
  'BCA Sem-III': [['Computer', 'BCA-III Sem.']],
  'BCA Sem-I': [['Computer', 'BCA-I Sem.']],
  'BCA Sem-V': [['Computer', 'BCA-V Sem.']],
  'BCOM-I A': [['Commerce', 'B.Com-I Sem.']],
  'BCOM-I B': [['Commerce', 'B.Com-I Sem.']],
  'BCOM-I FS': [['Commerce', 'B.Com-Ist Sem (FS)']],
  'BDMM-I': [['Computer', 'BDMM-I Sem']],
  'BDMM-III': [['Computer', 'BDMM-III Sem.']],
  'BDMM-V': [['Computer', 'BDMM-V Sem.']],
  'BDMM-VII': [['Computer', 'BDMM-VII Sem']],
  'BPT-I': [['Physiotherapy', 'BPT - I']],
  'BSc(AI & ML)-I': [['Computer', 'B.Sc (AI & ML) SEM-1']],
  'BSc(IT) Semester-I': [['Computer', 'B.Sc (IT)-I Sem']],
  'BSc(IT) Semester-III': [['Computer', 'B.Sc (IT)-III Sem.']],
  'BSc(IT) Semester-V': [['Computer', 'B.Sc (IT)-V Sem.']],
  'Certificate in Computer Animation -I': [['Computer', 'CC Ani- Sem-1']],
  'Certificate in Computer Application -I': [['Computer', 'CCA-Sem-1']],
  'Certificate in Computer Maintenance -I': [['Computer', 'CCM- SEM-1']],
  'M.Voc (WT&MM)-I': [['Computer', 'M.Voc (WT & MM) - I Sem']],
  'M.Voc (WT&MM)-III': [['Computer', 'M.Voc (WT & MM) - III Sem']],
  'MSC CHEM-I': [['Science', 'M.Sc (Chem) - I Semester']],
  'MSc(IT) Semester-I': [['Computer', 'M.Sc (IT)- I Sem']],
  'MSc(IT) Semester-III': [['Computer', 'M.Sc (IT)-III Sem.']],
  'PGDCA-I': [['Computer', 'PGDCA-I Sem.']]
};

/* normalized index of CLASS_MAP */
var CLASS_MAP_INDEX = {};
Object.keys(CLASS_MAP).forEach(function (k) { CLASS_MAP_INDEX[norm(k)] = CLASS_MAP[k]; });

/* ── Timetable teacher name -> Teacher.csv record (by name) ── */
var TEACHER_ALIAS = {
  'SK ANAND': 'Sanjeev Kumar Anand',
  'RATNAKAR': 'Ratnakar Mann',
  'VAISHALI GUPTA': 'Vaishali Gupta',
  'MEGHA': 'Megha',
  'RAVINDER KAUR': 'Ravinder Kaur',
  'TARANDEEP SAINI': 'Tarandeep Saini',
  'YUVIKA': 'Yuvika',
  'DR DALJIT KAUR': 'Daljit Kaur',
  'HEENA': 'Heena Kapoor',
  'HARSH': 'Harsh',
  'SONU GUPTA': 'Sonu Gupta',
  'NAVNEET KAUR': 'Navneet Kaur',
  'MS BHATIA': 'Mandeep Singh Bhatia',
  'RAKHI': 'Rakhi Talwar',
  'JASDEEP SINGH': 'Jasdeep Singh',
  'KARANBIR KLER': 'Karanbir Singh',
  'SEJAL': 'Sejal',
  'SEJAL AGGARWAL': 'Sejal Aggarwal',
  'RAJAT KAUR': 'Rajat',
  'ANJALI': 'Anjali',
  'MONICA': 'Monica',
  'MANPREET KAUR': 'Manpreet Kaur',
  'SANDEEP BASSI': 'Sandeep Bassi',
  'KARITIKA': 'Kritika',
  'SIMPY KATARIA': 'Simpy Kataria',
  'DR MS LEHAL': 'Manpreet Singh Lehal',
  'DR SANDEEP SINGH': 'Sandeep Singh',
  'SONALI BERI': 'Sonali',
  'ANNIE GOEL': 'Annie'
};

/* Load teachers from CSV */
var csv = read('Teacher.csv').replace(/^\uFEFF/, '');
var lines = csv.trim().split(/\r?\n/);
var header = lines[0];
var teacherRows = lines.slice(1).map(function (l) {
  var p = l.split(',');
  return { name: p[0].trim(), id: p[1].trim(), password: p[2].trim() };
});
var teacherByName = {};
teacherRows.forEach(function (t) { teacherByName[t.name] = t; });

/* Load student classes (validation only) */
global.window = { __DATA__: {} };
eval(read('data/data.js'));
var students = global.window.__DATA__.students;
var validClasses = {};
students.forEach(function (s) { validClasses[s.dept + '|' + s.course] = 1; });

/* Load timetable */
var tt = JSON.parse(read('TimeTable.json'));

var assignments = {};
teacherRows.forEach(function (t) { assignments[norm(t.name)] = []; });

var skippedTeachers = {};
var unseenPrograms = [];

tt.programs.forEach(function (p) {
  var progKey = norm(p.program_name);
  var mapped = CLASS_MAP_INDEX[progKey];
  if (!mapped) { unseenPrograms.push(p.program_name); return; }

  /* collect teachers for this program from the "Teacher" row */
  var trow = null;
  (p.other_unique_rows || []).forEach(function (r) {
    if (norm(r.feild_name) === 'teacher') trow = r;
  });

  var teachersInProg = {};
  if (trow) {
    Object.keys(trow).forEach(function (k) {
      if (k === 'feild_name') return;
      String(trow[k]).split('/').forEach(function (raw) {
        var n = norm(raw);
        if (!n || n === 'tba' || n === '-' ) return;
        var full = norm(TEACHER_ALIAS[raw.trim().toUpperCase()] || '');
        if (!full) {
          var canon = raw.trim().toUpperCase();
          skippedTeachers[canon] = (skippedTeachers[canon] || 0) + 1;
          return;
        }
        teachersInProg[full] = 1;
      });
    });
  }

  Object.keys(teachersInProg).forEach(function (tname) {
    mapped.forEach(function (cls) {
      var key = cls[0] + '|' + cls[1];
      if (!validClasses[key]) return;
      if (assignments[tname].indexOf(key) === -1) assignments[tname].push(key);
    });
  });
});

/* ── Build slot lookup: class+teacher -> lecture slots (subject/time/room/day) ── */
var slotLookup = {};
function ensureSlot(key, name) {
  if (!slotLookup[key]) slotLookup[key] = {};
  if (!slotLookup[key][name]) slotLookup[key][name] = [];
}
function resolveTeacherNames(raw) {
  var out = [];
  String(raw || '').split('/').forEach(function (seg) {
    var n = norm(seg);
    if (!n || n === 'tba' || n === '-') return;
    var full = TEACHER_ALIAS[seg.trim().toUpperCase()];
    if (full && out.indexOf(full) === -1) out.push(full);
  });
  return out;
}
tt.programs.forEach(function (p) {
  var progKey = norm(p.program_name);
  var mapped = CLASS_MAP_INDEX[progKey];
  if (!mapped) return;

  /* gather per-slot field info (subject, code, teacher, room, day) */
  var rowMap = {};
  (p.other_unique_rows || []).forEach(function (r) {
    var f = String(r.feild_name || '');
    Object.keys(r).forEach(function (k) {
      if (k === 'feild_name') return;
      if (!rowMap[k]) rowMap[k] = {};
      rowMap[k][f] = r[k];
    });
  });

  Object.keys(rowMap).forEach(function (slot) {
    var info = rowMap[slot];
    var time = slot.indexOf('_') !== -1 ? slot.slice(slot.indexOf('_') + 1) : slot;
    var entry = {
      slot: slot,
      time: time,
      subject: info.subject || '',
      code: info.Code || '',
      room: info.Room || '',
      day: info.Day || ''
    };
    resolveTeacherNames(info.Teacher).forEach(function (tname) {
      mapped.forEach(function (cls) {
        var key = cls[0] + '|' + cls[1];
        if (!validClasses[key]) return;
        ensureSlot(key, tname);
        var arr = slotLookup[key][tname];
        if (!arr.some(function (e) { return e.slot === slot && e.subject === entry.subject; })) {
          arr.push(JSON.parse(JSON.stringify(entry)));
        }
      });
    });
  });
});
Object.keys(slotLookup).forEach(function (key) {
  Object.keys(slotLookup[key]).forEach(function (name) {
    slotLookup[key][name].sort(function (a, b) { return a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0; });
  });
});

/* write output */
var out = 'window.__TEACHERS__ = window.__TEACHERS__ || {};\n';
out += 'window.__TEACHERS__.teachers = ' + JSON.stringify(teacherRows.map(function (t) {
  return {
    name: t.name,
    id: t.id,
    password: t.password,
    classes: assignments[norm(t.name)].map(function (k) {
      var i = k.indexOf('|');
      return { dept: k.slice(0, i), course: k.slice(i + 1) };
    })
  };
}), null, 2) + ';\n';
write('data/teachers.js', out);

/* write timetable metadata */
var ttOut = 'window.__TIMETABLE__ = window.__TIMETABLE__ || {};\n';
ttOut += 'window.__TIMETABLE__.slotLookup = ' + JSON.stringify(slotLookup, null, 1) + ';\n';
write('data/timetable.js', ttOut);
var slotClasses = Object.keys(slotLookup).length;
var slotEntries = 0;
Object.keys(slotLookup).forEach(function (k) {
  Object.keys(slotLookup[k]).forEach(function (n) { slotEntries += slotLookup[k][n].length; });
});
console.log('\nTimetable slotLookup: ' + slotClasses + ' classes, ' + slotEntries + ' slot entries');

/* report */
console.log('Header: ' + header);
console.log('Teachers in CSV: ' + teacherRows.length);
console.log('Timetable programs: ' + tt.programs.length + ', mapped: ' + (tt.programs.length - unseenPrograms.length));
if (unseenPrograms.length) {
  console.log('\nPROGRAMS WITHOUT A CLASS MAP (add to CLASS_MAP):');
  unseenPrograms.forEach(function (p) { console.log('  ' + JSON.stringify(p)); });
}
console.log('\nTimetable teacher names not matched to credentials (skipped):');
if (Object.keys(skippedTeachers).length) {
  Object.keys(skippedTeachers).forEach(function (n) { console.log('  ' + n + ' (x' + skippedTeachers[n] + ')'); });
} else {
  console.log('  (none)');
}
console.log('\nAssigned classes per teacher:');
var unassigned = 0;
teacherRows.forEach(function (t) {
  var n = assignments[norm(t.name)].length;
  if (n === 0) unassigned++;
  console.log('  ' + t.id.padEnd(6) + ' ' + t.name.padEnd(24) + ' ' + n);
});
console.log('\nTeachers with no assigned classes: ' + unassigned);
