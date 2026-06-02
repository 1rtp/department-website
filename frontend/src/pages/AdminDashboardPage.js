import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, Download, Search, Trash2, Pencil, X, ChevronDown, ChevronLeft, ChevronRight,
  Upload, CloudUpload, FileText, ImageIcon, Maximize2, Users, Send, LogOut,
  CheckCircle, XCircle, Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { adminApi, groupsApi } from '../utils/api';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useModals, ModalAlert, ModalConfirm } from '../utils/useModals';
import { useLanguage } from '../contexts/LanguageContext';
import XLSX from 'xlsx-js-style';

const stripExt = (name) => name?.replace(/\.[^/.]+$/, '') || name;

const PUB_TYPE_NORMALIZE = {
  'Стаття': 'article', 'Теза доповіді': 'thesis', 'Монографія': 'monograph',
  'Підручник': 'textbook', 'Навчальний посібник': 'manual', 'Патент': 'patent',
  'Article': 'article', 'Conference Abstract': 'thesis', 'Monograph': 'monograph',
  'Textbook': 'textbook', 'Study Guide': 'manual', 'Patent': 'patent',
};
const normalizePubType = (raw) => {
  if (!raw) return 'article';
  const valid = ['article', 'thesis', 'monograph', 'textbook', 'manual', 'patent'];
  if (valid.includes(raw)) return raw;
  return PUB_TYPE_NORMALIZE[raw] || 'article';
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const COURSES = [1, 2, 3];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);

const fmt = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => {
  if (!d) return '—';
  try { const dt = new Date(d); return `${fmt(dt.getDate())}.${fmt(dt.getMonth() + 1)}.${dt.getFullYear()}`; } catch { return d; }
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ page, total, limit, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const arr = [];
  if (pages <= 7) { for (let i = 1; i <= pages; i++) arr.push(i); }
  else {
    arr.push(1);
    if (page > 3) arr.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) arr.push(i);
    if (page < pages - 2) arr.push('...');
    arr.push(pages);
  }
  return (
    <div className="flex items-center gap-1 justify-center mt-6">
      <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
      {arr.map((p, i) => p === '...'
        ? <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">...</span>
        : <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-9 h-9 rounded-lg" onClick={() => onChange(p)}>{p}</Button>
      )}
      <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg" onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages}><ChevronRight className="w-4 h-4" /></Button>
    </div>
  );
};

// ─── Custom Select ─────────────────────────────────────────────────────────────

const Select = ({ value, onChange, options, placeholder, className = '' }) => {
  const [open, setOpen] = useState(false);
  const sel = options.find(o => o.value === value);
  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30">
        <span className={sel ? 'text-foreground' : 'text-muted-foreground'}>{sel ? sel.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-muted ${value === opt.value ? 'text-primary font-medium bg-primary/5' : 'text-foreground'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Modal ─────────────────────────────────────────────────────────────────────

const Modal = ({ onClose, children, maxW = 'max-w-lg', closeOnOverlay = true }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeOnOverlay ? onClose : undefined}>
    <div className={`w-full ${maxW} bg-card border border-border rounded-2xl shadow-xl`} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// ─── Admin Tab Nav ─────────────────────────────────────────────────────────────

const AdminTabNav = ({ active, onChange }) => {
  const { t } = useLanguage();

  const ADMIN_TABS = [
    { key: 'electives', label: t('admin.tab_electives') },
    { key: 'notifications', label: t('admin.tab_notifications') },
    { key: 'schedule', label: t('admin.tab_schedule') },
    { key: 'registration', label: t('admin.tab_registration') },
    { key: 'activity', label: t('admin.tab_activity') },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full mt-6 mb-8">
      <div className="flex flex-wrap gap-2 justify-start px-4 sm:px-6 lg:px-8">
        {ADMIN_TABS.map(t => (
          <button 
            key={t.key} 
            onClick={() => onChange(t.key)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap 
              ${active === t.key ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted' }`} >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── TAB 1: Electives Monitoring ───────────────────────────────────────────────

const getElectiveBlocks = (t) => [
  {
    id: 'b1',
    title: t('electives.block1_title'),
    disciplines: [
      { id: 'd1', name: t('electives.d1_name') },
      { id: 'd2', name: t('electives.d2_name') },
    ],
  },
  {
    id: 'b2',
    title: t('electives.block2_title'),
    disciplines: [
      { id: 'd3', name: t('electives.d3_name') },
      { id: 'd4', name: t('electives.d4_name') },
    ],
  },
];

const UA_DISCIPLINE_NAMES = [
  'Аналіз даних та програмні системи',
  'Розробка ігрових додатків на Unity',
  'Управління IT-проектами (Agile/Scrum)',
  'Проектування мобільних інтерфейсів',
];
const DISCIPLINE_IDS = ['d1', 'd2', 'd3', 'd4'];
const ID_TO_NAME = {
  d1: 'electives.d1_name', d2: 'electives.d2_name',
  d3: 'electives.d3_name', d4: 'electives.d4_name',
};

const getVoteCounts = (students, blocks) => {
  const idToName = {};
  const allDisciplines = blocks.flatMap(b => b.disciplines); // [{id, name}, ...]
  allDisciplines.forEach((d, i) => {
    idToName[d.id] = d.name;
    if (UA_DISCIPLINE_NAMES[i]) idToName[UA_DISCIPLINE_NAMES[i]] = d.name;
  });
  const counts = {};
  students.forEach(s => (s.elective_selections || []).forEach(d => {
    const label = idToName[d] || d;
    counts[label] = (counts[label] || 0) + 1;
  }));
  return counts;
};

const BarChart = ({ counts }) => {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(e => e[1]), 1);
  const height = 120; const barW = 40; const gap = 20;
  const w = entries.length * (barW + gap);
  return (
    <svg width={w} height={height + 40} viewBox={`0 0 ${w} ${height + 40}`} className="overflow-visible">
      {[0, Math.ceil(max / 2), max].map(v => (
        <g key={v}>
          <line x1={0} y1={height - (v / max) * height} x2={w} y2={height - (v / max) * height} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
          <text x={-5} y={height - (v / max) * height + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.5}>{v}</text>
        </g>
      ))}
      {entries.map(([, count], i) => {
        const x = i * (barW + gap);
        const bh = Math.max(4, (count / max) * height);
        return (
          <g key={i}>
            <rect x={x} y={height - bh} width={barW} height={bh} rx={4} fill="hsl(var(--primary))" opacity={0.7} />
            <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
};

const TabElectives = () => {
  const { t, language } = useLanguage();
  const ELECTIVE_BLOCKS = getElectiveBlocks(t);
  const { alert, confirm, alertState, confirmState, closeAlert, closeConfirm } = useModals();
  const [course, setCourse] = useState('1');
  const [group, setGroup] = useState('all');
  const [discipline, setDiscipline] = useState('all');
  const [page, setPage] = useState(1);
  const [editStudent, setEditStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [rawGroups, setRawGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const LIMIT = 10;

  const ALL_DISCIPLINES = [
    { value: 'all', label: t('admin.all_disciplines') },
    { value: 'none', label: t('admin.not_chosen') },
    { value: 'd1', label: t('electives.d1_name') },
    { value: 'd2', label: t('electives.d2_name') },
    { value: 'd3', label: t('electives.d3_name') },
    { value: 'd4', label: t('electives.d4_name') },
  ];

  const groupOptions = [
    { value: 'all', label: t('admin.all_groups') },
    ...rawGroups.map(g => ({ value: g.id, label: g.name }))
  ];

  useEffect(() => {
    groupsApi.getByCourse(course)
      .then(r => {
        setRawGroups(r.data || []);
        setGroup('all');
      })
      .catch(() => {});
  }, [course]);

  useEffect(() => {
    setLoading(true);
    const params = { course: Number(course), page: 1, limit: 200 };
    if (group !== 'all') params.group_id = group;
    adminApi.getElectiveSelections(params)
      .then(r => setStudents(r.data?.items || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [course, group]);

  const allStudents = students;

  const disciplineIdx = ['d1','d2','d3','d4'].indexOf(discipline);
  const disciplineAllNames = disciplineIdx >= 0
    ? [
        ELECTIVE_BLOCKS.flatMap(b => b.disciplines)[disciplineIdx],
        UA_DISCIPLINE_NAMES[disciplineIdx],
        discipline,
      ]
    : [];

  const filtered = discipline === 'none'
    ? allStudents.filter(s => !(s.elective_selections || []).length)
    : discipline === 'all'
    ? allStudents
    : allStudents.filter(s =>
        (s.elective_selections || []).some(sel =>
          disciplineAllNames.includes(sel)
        )
      );

  const showStats = discipline !== 'none';
  const votedCount = allStudents.filter(s => s.elective_selections?.length > 0).length;
  const totalCount = allStudents.length;
  const voteCounts = getVoteCounts(allStudents, ELECTIVE_BLOCKS);

  const handleExport = () => {
    const header = [
      t('admin.col_num'),
      t('admin.col_student'),
      t('admin.col_group'),
      t('admin.col_disciplines')
    ];

    const dataRows = filtered.map((s, i) => {
      const selections = (s.elective_selections || []).map(sel =>
        ID_TO_NAME[sel] ? t(ID_TO_NAME[sel]) : sel
      );
      let disciplineCell;
      if (selections.length === 0) {
        disciplineCell = t('admin.not_selected');
      } else if (discipline !== 'all' && discipline !== 'none' && disciplineAllNames.length > 0) {
        // Only show the matched discipline
        const matched = selections.filter(sel => disciplineAllNames.includes(sel));
        disciplineCell = matched.length > 0
          ? matched.map((d, j) => `${j + 1}. ${d}`).join('\n')
          : t('admin.not_selected');
      } else {
        disciplineCell = selections.map((d, j) => `${j + 1}. ${d}`).join('\n');
      }
      return [
        i + 1,
        s.name,
        s.group_name || s.group_id || '—',
        disciplineCell,
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

    header.forEach((_, ci) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (!ws[cellRef]) return;
      ws[cellRef].s = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    });

    dataRows.forEach((row, ri) => {
      row.forEach((_, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: colIndex });
        if (!ws[cellRef]) return;
        ws[cellRef].s = { alignment: { vertical: 'top', wrapText: true } };
        if (colIndex === 0 || colIndex === 2) {
          ws[cellRef].s.alignment.horizontal = 'center';
        }
      });
    });

    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 60 }];

    XLSX.utils.book_append_sheet(wb, ws, t('admin.tab_electives'));
    XLSX.writeFile(wb, `electives_course${course}.xlsx`);
  };

  const handleRemindAll = async () => {
    const debtors = allStudents.filter(s => !s.elective_selections?.length);
    if (!debtors.length) { alert(t('admin.all_selected'), 'info'); return; }
    try {
      await adminApi.sendElectiveReminderAll(group !== 'all' ? group : undefined);
      alert(`${t('admin.reminder_sent_all')} ${debtors.length}`, 'success');
    } catch { alert(t('admin.send_error'), 'error'); }
  };

  const handleRemindOne = async (student) => {
    try {
      await adminApi.sendElectiveReminder(student.id);
      alert(`${t('admin.reminder_sent_one')} ${student.name}`, 'success');
    } catch { alert(t('admin.send_error'), 'error'); }
  };

  const handleSaveStudentEdit = async () => {
    try {
      await adminApi.updateStudentSelection(editStudent.id, { selected_disciplines: editStudent.elective_selections || [] });
      setStudents(prev => prev.map(s => s.id === editStudent.id ? { ...s, elective_selections: editStudent.elective_selections } : s));
      setEditStudent(null);
    } catch { alert(t('admin.save_error'), 'error'); }
  };

  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <div>
      {/* Title + Course selector */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {t('admin.electives_monitoring')}
        </h1>
        <Select value={course} onChange={v => { setCourse(v); setGroup('all'); setDiscipline('all'); setPage(1); }}
          options={COURSES.map(c => ({ value: String(c), label: `${c} ${t('register.course_suffix')}` }))} className="w-36" />
      </div>
      <p className="text-sm text-muted-foreground mb-6">{t('admin.electives_subtitle')}</p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin.study_group')}</label>
          <Select value={group} onChange={v => { setGroup(v); setPage(1); }} options={groupOptions} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin.discipline')}</label>
          <Select value={discipline} onChange={v => { setDiscipline(v); setPage(1); }} options={ALL_DISCIPLINES} />
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('admin.vote_distribution')} {course} {t('register.course_suffix')} {group !== 'all' ? `(${t('admin.group_label')} ${groupOptions.find(o => o.value === group)?.label || group})` : t('admin.all_groups_label')}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('admin.total_voted')} {votedCount} {t('admin.of')} {totalCount} {t('admin.students')} ({totalCount ? Math.round(votedCount / totalCount * 100) : 0}%)
          </p>
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="overflow-x-auto"><BarChart counts={voteCounts} /></div>
            <div className="space-y-1 text-sm">
              {Object.entries(voteCounts).map(([name, count], i) => (
                <div key={i} className="text-foreground">{i + 1}. {name}: <span className="font-semibold">{count} {t('admin.votes')}</span></div>
              ))}
            </div>
          </div>
          <Button className="mt-4 rounded-xl gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> {t('admin.export_results')}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('admin.electives_registry')}</h2>
        {discipline === 'none' && (
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleRemindAll}
            disabled={allStudents.filter(s => !s.elective_selections?.length).length === 0}
          >
            <Bell className="w-4 h-4" /> {t('admin.remind_all')}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">{t('common.loading')}</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_120px_1fr_100px] px-4 py-3 border-b border-border bg-muted/30">
            {[t('admin.col_num'), t('admin.col_student'), t('admin.col_group'), t('admin.col_disciplines'), t('admin.col_actions')].map(h => (
              <div key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
            ))}
          </div>
          {paginated.length > 0 ? paginated.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[60px_1fr_120px_1fr_100px] px-4 py-3.5 items-start border-b border-border last:border-0 hover:bg-muted/20">
              <div className="text-sm text-muted-foreground pt-0.5">{(page - 1) * LIMIT + i + 1}</div>
              <div className="text-sm font-medium text-foreground">{s.name}</div>
              <div className="text-sm text-muted-foreground">{s.group_name || s.group_id || '—'}</div>
              <div className="text-sm text-muted-foreground">
                {(() => {
                  const selections = (s.elective_selections || []).map(sel =>
                    ID_TO_NAME[sel] ? t(ID_TO_NAME[sel]) : sel
                  );
                  if (selections.length === 0) {
                    return <span className="text-muted-foreground/60 italic">{t('admin.not_selected')}</span>;
                  }
                  if (discipline !== 'all' && discipline !== 'none' && disciplineAllNames.length > 0) {
                    const matched = selections.filter(sel => disciplineAllNames.includes(sel));
                    return matched.length > 0
                      ? matched.map((d, j) => <div key={j}>1. {d}</div>)
                      : <span className="text-muted-foreground/60 italic">{t('admin.not_selected')}</span>;
                  }
                  return selections.map((d, j) => <div key={j}>{j + 1}. {d}</div>);
                })()}
              </div>
              <div className="flex items-center gap-1 pt-0.5">
                {discipline === 'none'
                  ? <button onClick={() => handleRemindOne(s)} title={t('admin.send_reminder')}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
                      <Bell className="w-4 h-4" />
                    </button>
                  : <button onClick={() => setEditStudent({ ...s, elective_selections: [...(s.elective_selections || [])] })} title={t('admin.edit_selection')}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                }
              </div>
            </div>
          )) : (
            <div className="py-10 text-center text-muted-foreground text-sm">
              {discipline === 'none' ? t('admin.all_selected') : t('common.no_data')}
            </div>
          )}
        </div>
      )}
      <Pagination page={page} total={filtered.length} limit={LIMIT} onChange={setPage} />

      {/* Edit student selection modal */}
      {editStudent && (
        <Modal onClose={() => setEditStudent(null)} closeOnOverlay={false}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t('admin.edit_selection')}
              </h2>
              <button onClick={() => setEditStudent(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm font-medium text-foreground mb-1">{editStudent.name}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {t('admin.current_selection')}: {(editStudent.elective_selections || []).join(', ') || t('admin.not_selected')}
            </p>

            <div className="space-y-3 mb-6">
              {ELECTIVE_BLOCKS.map(block => {
                const blockSelected = (editStudent.elective_selections || []).find(s =>
                  block.disciplines.some(d => d.id === s || d.name === s)
                ) || null;

                return (
                  <div key={block.id} className="rounded-xl border border-border overflow-hidden">
                    <div className="px-3 py-2 bg-muted/40 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {block.title}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {block.disciplines.map(d => {
                        const isChecked = blockSelected === d.id || blockSelected === d.name;
                        return (
                          <label
                            key={d}
                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                              ${isChecked ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                          >
                            <input
                              type="radio"
                              name={`block-${block.id}`}
                              checked={isChecked}
                              onChange={() => {
                                const currentSels = editStudent.elective_selections || [];
                                const newSels = ELECTIVE_BLOCKS.map(b => {
                                  if (b.id === block.id) return d.id;
                                  return currentSels.find(s => b.disciplines.some(bd => bd.id === s || bd.name === s)) || null;
                                }).filter(Boolean);
                                setEditStudent(prev => ({ ...prev, elective_selections: newSels }));
                              }}
                              className="accent-primary"
                            />
                            <span className={`text-sm ${isChecked ? 'text-primary font-medium' : 'text-foreground'}`}>
                              {d.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditStudent(null)}>
                {t('dashboard.cancel')}
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleSaveStudentEdit}
                disabled={
                  ELECTIVE_BLOCKS.some(block =>
                    !(editStudent.elective_selections || []).find(s => block.disciplines.some(d => d.id === s || d.name === s))
                  )
                }
              >
                {t('dashboard.save_changes')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
      <ModalConfirm message={confirmState.message} onConfirm={confirmState.onConfirm} onClose={closeConfirm} />
    </div>
  );
};

// ─── TAB 2: Notifications ──────────────────────────────────────────────────────

const DEMO_HISTORY = [];

const TabNotifications = () => {
  const { t } = useLanguage();
  const { alert, confirm, alertState, confirmState, closeAlert, closeConfirm } = useModals();
  const [recipient, setRecipient] = useState('students');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editMsg, setEditMsg] = useState(null);
  const LIMIT = 10;

  const RECIPIENT_OPTIONS = [
    { value: 'students', label: t('admin.recipients_students') },
    { value: 'staff', label: t('admin.recipients_staff') },
    { value: 'all', label: t('admin.recipients_all') },
  ];

  useEffect(() => {
    adminApi.getNotifications({ page: 1, limit: 100 })
      .then(r => setHistory(r.data?.items || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !text.trim()) return;
    setSending(true);
    try {
      const res = await adminApi.sendNotification({ recipient, title, text });
      const newMsg = res.data;
      setHistory(h => [{ ...newMsg, date: fmtDate(new Date().toISOString()) }, ...h]);
      setTitle(''); setText('');
      alert(t('admin.message_sent'), 'success');
    } catch (e) {
      alert(t('admin.send_error') + (e?.response?.data?.detail || e.message), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (id) => {
    confirm(t('admin.confirm_delete_notification'), async () => {
      try { await adminApi.deleteNotification(id); } catch {}
      setHistory(h => h.filter(m => m.id !== id));
    });
  };

  const handleSaveEdit = async () => {
    try { await adminApi.updateNotification(editMsg.id, { title: editMsg.title, text: editMsg.text }); } catch {}
    setHistory(h => h.map(m => m.id === editMsg.id ? editMsg : m));
    setEditMsg(null);
  };

  const filtered = history.filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <div>
      {/* Create form */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {t('admin.create_notification')}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{t('admin.create_notification_subtitle')}</p>

        <div className="space-y-5 w-full"> 
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.recipient_label')}</label>
            <Select value={recipient} onChange={setRecipient} options={RECIPIENT_OPTIONS} className="max-w-xs" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.message_subject')}</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder={t('admin.subject_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.message_text')}</label>
            <textarea 
              value={text} 
              onChange={e => setText(e.target.value)} 
              rows={5} 
              placeholder={t('admin.text_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" 
            />
          </div>

          <div className="flex justify-center pt-2">
            <Button 
              className="rounded-xl px-12 gap-2" 
              onClick={handleSend} 
              disabled={sending || !title.trim() || !text.trim()}
            >
              {sending ? t('admin.sending') : t('admin.send_message')}
            </Button>
          </div>
        </div>
      </div>

      {/* History */}
      <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('admin.send_history')}</h2>
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('admin.search_by_title')}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[60px_200px_1fr_160px_100px] px-4 py-3 border-b border-border bg-muted/30">
          {[t('admin.col_num'), t('admin.col_subject'), t('admin.col_text'), t('admin.col_sent_date'), t('admin.col_actions')].map(h => (
            <div key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
          ))}
        </div>
        {paginated.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">{t('common.no_data')}</div> )}
        {paginated.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[60px_200px_1fr_160px_100px] px-4 py-3.5 items-center border-b border-border last:border-0 hover:bg-muted/20">
            <div className="text-sm text-muted-foreground">{(page - 1) * LIMIT + i + 1}</div>
            <div className="text-sm font-medium text-foreground pr-2">{m.title}</div>
            <div className="text-sm text-muted-foreground line-clamp-2 pr-2">{m.text}</div>
            <div className="text-sm text-muted-foreground">{m.date || fmtDate(m.sent_at)}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditMsg({ ...m })} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} total={filtered.length} limit={LIMIT} onChange={setPage} />

      {editMsg && (
        <Modal onClose={() => setEditMsg(null)} closeOnOverlay={false}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('admin.edit_notification')}</h2>
              <button onClick={() => setEditMsg(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.subject_label')}</label>
                <input value={editMsg.title} onChange={e => setEditMsg(m => ({ ...m, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.text_label')}</label>
                <textarea value={editMsg.text} onChange={e => setEditMsg(m => ({ ...m, text: e.target.value }))} rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditMsg(null)}>{t('dashboard.cancel')}</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSaveEdit}>{t('dashboard.save_changes')}</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
      <ModalConfirm message={confirmState.message} onConfirm={confirmState.onConfirm} onClose={closeConfirm} />
    </div>
  );
};

// ─── TAB 3: Schedule Management ────────────────────────────────────────────────

const TabSchedule = () => {
  const { t } = useLanguage();
  const { alert, alertState, closeAlert } = useModals();
  const [scheduleData, setScheduleData] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef();

  // Load current schedule from server
  useEffect(() => {
    adminApi.getSchedule()
      .then(r => { if (r.data?.filename) setScheduleData(r.data); })
      .catch(() => {});
  }, []);

  const handleFiles = (files) => {
    const f = Array.from(files).find(f => ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf'].includes(f.type));
    if (f) setFile(f);
  };

  const handleApply = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await adminApi.uploadSchedule({ file_data: base64, filename: file.name });
      setScheduleData({ file_data: base64, filename: file.name, published: false });
      setUploadOpen(false);
      setFile(null);
    } catch {
      alert(t('admin.upload_error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await adminApi.publishSchedule();
      setScheduleData(prev => ({ ...prev, published: true }));
      alert(t('admin.schedule_published'), 'success');
    } catch {
      alert(t('admin.publish_error'), 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('admin.schedule_title')}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        {t('admin.schedule_subtitle')}
      </p>

      {/* Preview area */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-foreground">{t('admin.schedule_preview')}</h2>
          {scheduleData?.published && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
              ✓ {t('admin.published')}
            </span>
          )}
          {scheduleData?.filename && !scheduleData?.published && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">
              {t('admin.not_published')}
            </span>
          )}
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" /> {t('admin.upload_schedule')}
        </Button>
      </div>

      <div className="relative bg-muted/30 border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted text-lg leading-none">+</button>
          <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted text-lg leading-none">−</button>
          <span className="text-xs text-muted-foreground ml-1">{zoom}%</span>
          <div className="flex-1" />
          {scheduleData?.file_data && (
            <button onClick={() => setFullscreen(v => !v)} className="text-muted-foreground hover:text-foreground p-1">
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-center min-h-[360px] overflow-auto p-4">
          {scheduleData?.file_data
            ? <img src={scheduleData.file_data} alt="Schedule" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', maxWidth: '100%' }} />
            : <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <ImageIcon className="w-16 h-16" />
                <span className="text-sm">{t('admin.schedule_not_uploaded')}</span>
              </div>
          }
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <Button className="rounded-xl px-8" disabled={!scheduleData?.file_data || publishing} onClick={handlePublish}>
          {publishing ? t('admin.publishing') : t('admin.publish_schedule')}
        </Button>
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <Modal onClose={() => { setUploadOpen(false); setFile(null); }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t('admin.upload_schedule_title')}
              </h2>
              <button onClick={() => { setUploadOpen(false); setFile(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center mb-3 cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
            >
              <CloudUpload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('dashboard.drag_files')}</p>
              <p className="text-xs text-muted-foreground my-2">{t('dashboard.or')}</p>
              <Button variant="outline" size="sm" className="rounded-lg" type="button">{t('dashboard.choose_file')}</Button>
              <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.svg" className="hidden" onChange={e => handleFiles(e.target.files)} />
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('admin.schedule_formats')}</p>
            {file && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-4">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</div>
                </div>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setUploadOpen(false); setFile(null); }}>{t('dashboard.cancel')}</Button>
              <Button className="flex-1 rounded-xl" onClick={handleApply} disabled={!file || uploading}>
                {uploading ? t('common.loading') : t('dashboard.apply')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fullscreen */}
      {fullscreen && scheduleData?.file_data && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreen(false)}>
          <img src={scheduleData.file_data} alt="Schedule fullscreen" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
    </div>
  );
};

// ─── TAB 4: Registration Approval ──────────────────────────────────────────────

const DEMO_REQUESTS = [];

const roleLabel = (role, t) => {
  const map = { student: t('dashboard.student_fallback'), staff: t('admin.role_staff'), admin: t('admin.role_admin') };
  return map[role] || role || '—';
};

const TabRegistration = () => {
  const { t } = useLanguage();
  const { alert, alertState, closeAlert } = useModals();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState({});
  const LIMIT = 10;

  // Load pending users from server
  useEffect(() => {
    adminApi.getPendingUsers()
      .then(r => setRequests(r.data || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (req) => {
    setProcessing(p => ({ ...p, [req.id]: 'approve' }));
    try {
      const res = await adminApi.approveUser(req.id);
      setRequests(r => r.filter(x => x.id !== req.id));
      
      const successMessage = (
        <div className="flex flex-col gap-1 text-center">
          <span>{t('admin.request_approved')}: <b>{req.name}</b></span>
          <span>{t('admin.password_sent_to')}: {req.email}</span>
          <span>{t('admin.temp_password')}: <b>{res.data?.temp_password || t('admin.sent_to_email')}</b></span>
        </div>
      );

      alert(successMessage, 'success');
    } catch (e) {
      alert(`${t('admin.save_error')}: ${e?.response?.data?.detail || e.message}`, 'error');
    } finally {
      setProcessing(p => { 
        const n = { ...p }; 
        delete n[req.id]; 
        return n; 
      });
    }
  };

  const handleReject = async (id) => {
    setProcessing(p => ({ ...p, [id]: 'reject' }));
    try { await adminApi.rejectUser(id); } catch {}
    setRequests(r => r.filter(x => x.id !== id));
    setProcessing(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const handleApproveAll = async () => {
    if (!filtered.length) return;
    const toApprove = [...filtered];
    for (const req of toApprove) {
      try { await adminApi.approveUser(req.id); } catch {}
    }
    setRequests(r => r.filter(x => !toApprove.find(a => a.id === x.id)));
    alert(`${t('admin.all_approved')} (${toApprove.length}). ${t('admin.passwords_sent')}`, 'success');
  };

  const filtered = requests.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('admin.registration_title')}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{t('admin.registration_subtitle')}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('admin.search_by_name')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button className="rounded-xl gap-2" onClick={handleApproveAll} disabled={!filtered.length}>
          <CheckCircle className="w-4 h-4" /> {t('admin.approve_all')}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('admin.no_requests')}</p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_120px_1fr_140px_100px] px-4 py-3 border-b border-border bg-muted/30">
              {[t('admin.col_num'), t('admin.col_name'), t('admin.col_role'), t('admin.col_email'), t('admin.col_request_date'), t('admin.col_actions')].map(h => (
                <div key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</div>
              ))}
            </div>
            {paginated.map((req, i) => (
              <div key={req.id} className="grid grid-cols-[60px_1fr_120px_1fr_140px_100px] px-4 py-3.5 items-center border-b border-border last:border-0 hover:bg-muted/20">
                <div className="text-sm text-muted-foreground">{(page - 1) * LIMIT + i + 1}</div>
                <div className="text-sm font-semibold text-foreground">{req.name}</div>
                <div className="text-sm text-muted-foreground">{roleLabel(req.role, t)}</div>
                <div className="text-sm text-muted-foreground">{req.email}</div>
                <div className="text-sm text-muted-foreground">{req.date}</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleApprove(req)} disabled={!!processing[req.id]} title={t('admin.approve')}
                    className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-muted-foreground hover:text-green-600 disabled:opacity-50">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleReject(req.id)} disabled={!!processing[req.id]} title={t('admin.reject')}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 disabled:opacity-50">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} total={filtered.length} limit={LIMIT} onChange={setPage} />
        </>
      )}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
    </div>
  );
};

// ─── TAB 5: Staff Activity Registry ────────────────────────────────────────────

const DEMO_PUBS = [];
const DEMO_CERTS = [];

const TabActivity = () => {
  const { t } = useLanguage();
  const { alert, confirm, alertState, confirmState, closeAlert, closeConfirm } = useModals();
  const [dataType, setDataType] = useState('publications');
  const [year, setYear] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pubTypeFilter, setPubTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = {
      page: 1,
      limit: 500,
      ...(year !== 'all' && { year }),
      ...(debouncedSearch && { search: debouncedSearch }),
    };
    const fetcher = dataType === 'publications'
      ? adminApi.getStaffPublications(params)
      : adminApi.getStaffCertificates(params);
    fetcher
      .then(r => setData(r.data?.items || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [dataType, year, debouncedSearch]);

  const PUB_TYPES = ['article', 'thesis', 'monograph', 'textbook', 'manual', 'patent'];

  const filtered = data.filter(d => {
    const matchType = dataType !== 'publications' || pubTypeFilter === 'all' || normalizePubType(d.pub_type || d.type) === pubTypeFilter;
    return matchType;
  });
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const handleExport = () => {
    const cols = dataType === 'publications'
      ? [t('admin.col_num'), t('admin.col_staff_name'), t('admin.col_pub_title'), t('admin.col_type'), t('admin.col_pub_date')]
      : [t('admin.col_num'), t('admin.col_staff_name'), t('admin.col_cert_info'), t('admin.col_cert_date')];

    const dataRows = filtered.map((d, i) => {
      if (dataType === 'publications') {
        return [i + 1, d.staff_name, stripExt(d.name), d.pub_type ? t(`pub_types.${normalizePubType(d.pub_type)}`) : '—', d.date];
      } else {
        return [i + 1, d.staff_name, stripExt(d.name), d.date];
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...dataRows]);

    cols.forEach((_, ci) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (!ws[cellRef]) return;
      ws[cellRef].s = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    });

    const pubCenterCols = new Set([0, 3, 4]);
    const certCenterCols = new Set([0, 3]);

    dataRows.forEach((row, ri) => {
      row.forEach((_, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (!ws[cellRef]) return;
        const centerSet = dataType === 'publications' ? pubCenterCols : certCenterCols;
        const isCenter = centerSet.has(ci);
        ws[cellRef].s = {
          alignment: {
            vertical: 'top',
            wrapText: true,
            horizontal: isCenter ? 'center' : 'left',
          }
        };
      });
    });

    if (dataType === 'publications') {
      ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 50 }, { wch: 15 }, { wch: 20 }];
    } else {
      ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 60 }, { wch: 20 }];
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Дані');
    XLSX.writeFile(wb, `staff_${dataType}_${year}.xlsx`);
  };

  const handleDelete = async (d) => {
    confirm(`${t('admin.delete_confirm')} "${stripExt(d.name)}"?`, async () => {
      try {
        await adminApi.deleteStaffDoc(d.staff_id, d.id, dataType === 'publications' ? 'publication' : 'certificate');
        setData(prev => prev.filter(x => x.id !== d.id));
      } catch { alert(t('admin.delete_error'), 'error'); }
    });
  };

  const handleDownload = (d) => {
    if (d.file_data) {
      const a = document.createElement('a');
      a.href = d.file_data;
      a.download = d.name;
      a.click();
    } else {
      alert(`${t('dashboard.file_no_data')} "${d.name}"`, 'info');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('admin.activity_title')}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{t('admin.activity_subtitle')}</p>

      {/* Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin.data_type')}</label>
          <Select value={dataType} onChange={v => { setDataType(v); setPage(1); }} options={[{ value: 'publications', label: t('dashboard.tab_publications')}, { value: 'certificates', label: t('dashboard.tab_certificates')}]} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('admin.select_year')}</label>
          <Select value={year} onChange={v => { setYear(v); setPage(1); }} options={[{ value: 'all', label: t('admin.all_years') }, ...YEARS.map(y => ({ value: String(y), label: String(y) }))]} />
        </div>
      </div>

      {/* Search + type filter + export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('admin.search_by_name_or_staff')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {dataType === 'publications' && (
          <Select value={pubTypeFilter} onChange={v => { setPubTypeFilter(v); setPage(1); }}
            options={[{ value: 'all', label: t('dashboard.all_types') }, ...PUB_TYPES.map(key => ({ value: key, label: t(`pub_types.${key}`) }))]}
            className="sm:w-56" />
        )}
        <Button className="rounded-xl gap-2 flex-shrink-0" onClick={handleExport}>
          <Download className="w-4 h-4" />{t('admin.generate_report')}
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {dataType === 'publications' ? (
          <>
            <div className="grid grid-cols-[50px_150px_minmax(0,1fr)_110px_185px] px-4 py-3 border-b border-border bg-muted/30">
              {[t('admin.col_num'), t('admin.col_staff_name'), t('admin.col_pub_title'), t('admin.col_type'), t('admin.col_pub_date')].map((h, index) => (
                <div 
                  key={h} 
                  className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider ${
                    index === 2 || index === 3 || index === 4 ? 'text-center' : ''
                  }`}
                >
                  {h}
                </div>
              ))}
            </div>
            {paginated.map((d, i) => (
              <div key={d.id} className="grid grid-cols-[50px_150px_minmax(0,1fr)_110px_185px] px-4 py-3.5 items-start border-b border-border last:border-0 hover:bg-muted/20">
                <div className="text-sm text-muted-foreground pt-0.5">{(page - 1) * LIMIT + i + 1}</div>
                <div className="text-sm text-muted-foreground">{d.staff_name}</div>
                <div className="pr-6 text-left">
                  <div className="text-sm font-medium text-foreground">{stripExt(d.name)}</div>
                </div>
                <div className="text-sm text-muted-foreground text-center">{d.pub_type || d.type ? t(`pub_types.${normalizePubType(d.pub_type || d.type)}`) : '—'}</div>
                <div className="text-sm text-muted-foreground text-center">{d.date}</div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="grid grid-cols-[50px_160px_minmax(0,1fr)_160px] px-4 py-3 border-b border-border bg-muted/30">
              {[t('admin.col_num'), t('admin.col_staff_name'), t('admin.col_cert_info'), t('admin.col_cert_date')].map((h, index) => (
                <div 
                  key={h} 
                  className={`text-xs font-semibold text-muted-foreground uppercase tracking-wider ${
                    index === 2 || index === 3 ? 'text-center' : ''
                  }`}
                >
                  {h}
                </div>
              ))}
            </div>
            {paginated.map((d, i) => (
              <div key={d.id} className="grid grid-cols-[50px_160px_minmax(0,1fr)_160px] px-4 py-3.5 items-start border-b border-border last:border-0 hover:bg-muted/20">
                <div className="text-sm text-muted-foreground pt-0.5">{(page - 1) * LIMIT + i + 1}</div>
                <div className="text-sm text-muted-foreground">{d.staff_name}</div>
                <div className="pr-6 text-left">
                  <div className="text-sm font-medium text-foreground">{stripExt(d.name)}</div>
                </div>
                <div className="text-sm text-muted-foreground text-center">{d.date}</div>
              </div>
            ))}
          </>
        )}
        {paginated.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">{t('common.no_data')}</div>
        )}
      </div>
      <Pagination page={page} total={filtered.length} limit={LIMIT} onChange={setPage} />
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
      <ModalConfirm message={confirmState.message} onConfirm={confirmState.onConfirm} onClose={closeConfirm} />
    </div>
  );
};

// ─── MAIN ADMIN DASHBOARD PAGE ─────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('electives');

  useEffect(() => {
    const stored = localStorage.getItem('auth_user');
    if (!stored) { navigate('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { navigate('/login'); return; }
    setUser(u);
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Tab navigation */}
      <AdminTabNav active={activeTab} onChange={setActiveTab} />

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {activeTab === 'electives'     && <TabElectives />}
          {activeTab === 'notifications' && <TabNotifications key={activeTab} />}
          {activeTab === 'schedule'      && <TabSchedule />}
          {activeTab === 'registration'  && <TabRegistration />}
          {activeTab === 'activity'      && <TabActivity />}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}