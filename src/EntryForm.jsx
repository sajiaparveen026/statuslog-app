import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

// Load Playfair Display font
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap'
document.head.appendChild(fontLink)
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function EntryForm() {
  const { user, logout } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function formatDateTime(date) {
    const d = date.getDate().toString().padStart(2, '0')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const m = months[date.getMonth()]
    const y = date.getFullYear()
    const h = date.getHours() % 12 || 12
    const min = date.getMinutes().toString().padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
    return `${d} ${m} ${y} | ${h}:${min} ${ampm}`
  }
  const now = new Date()

  const [userName, setUserName] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [allEntryDates, setAllEntryDates] = useState([])
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(String(now.getMonth() + 1).padStart(2,'0'))
  const [pickerYear, setPickerYear] = useState(String(now.getFullYear()))

  const [projects, setProjects] = useState([])
  const [allProcesses, setAllProcesses] = useState([])
  const [allSubProcesses, setAllSubProcesses] = useState([])

  const [popupMode, setPopupMode] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)

  // Toggle action column visibility
  const [editMode, setEditMode] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 12

  // Confirm delete
  const [deleteId, setDeleteId] = useState(null)

  // Form fields
  // Use local date to avoid timezone issues
  const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const [formDate, setFormDate] = useState(localDate)
  const [formProjectId, setFormProjectId] = useState('')
  const [formProcessId, setFormProcessId] = useState('')
  const [formSubProcess, setFormSubProcess] = useState('')
  const [formCustomProcess, setFormCustomProcess] = useState('')
  const [formDayType, setFormDayType] = useState('working')
  const [formWorkedHours, setFormWorkedHours] = useState('8')
  const [formComment, setFormComment] = useState('')
  const [formAllocated, setFormAllocated] = useState('')
  const [formDone, setFormDone] = useState('')
  const [formTarget, setFormTarget] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { loadUserName(); loadAllData(); loadAllEntryDates() }, [])
  useEffect(() => { loadEntries(); setCurrentPage(1) }, [selectedMonth, selectedYear])

  async function loadAllEntryDates() {
    const { data } = await supabase
      .from('entries')
      .select('entry_date')
      .eq('user_id', user.id)
    setAllEntryDates(data || [])
  }

  async function loadUserName() {
    const { data } = await supabase.from('users').select('name').eq('id', user.id).single()
    setUserName(data?.name || '')
  }

  async function loadAllData() {
    const [{ data: proj }, { data: proc }, { data: sub }] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('processes').select('*').order('name'),
      supabase.from('sub_processes').select('*').order('name')
    ])
    setProjects(proj || [])
    setAllProcesses(proc || [])
    setAllSubProcesses(sub || [])
  }

  async function loadEntries() {
    setLoadingEntries(true)
    const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`
    const { data } = await supabase
      .from('entries').select('*, projects(name)')
      .eq('user_id', user.id)
      .gte('entry_date', start).lte('entry_date', end)
      .order('entry_date', { ascending: true })
    setEntries(data || [])
    setLoadingEntries(false)
  }

  const filteredProcesses = allProcesses.filter(p => p.project_id === formProjectId)
  const selectedProcess = allProcesses.find(p => p.id === formProcessId)
  const filteredSubProcesses = allSubProcesses.filter(p => p.process_id === formProcessId)
  const selectedSubProcess = allSubProcesses.find(s => s.id === formSubProcess)
  const isOther = selectedSubProcess?.is_other === true

  function handleProjectChange(val) {
    setFormProjectId(val); setFormProcessId('')
    setFormSubProcess(''); setFormCustomProcess('')
  }
  function handleProcessChange(val) {
    setFormProcessId(val); setFormSubProcess(''); setFormCustomProcess('')
  }

  function openAddPopup() {
    setPopupMode('add')
    setEditingEntry(null)
    setFormDate(now.toISOString().split('T')[0])
    setFormProjectId(''); setFormProcessId('')
    setFormSubProcess(''); setFormCustomProcess('')
    setFormDayType('working')
    setFormAllocated(''); setFormDone('')
    setFormTarget('')
    setFormWorkedHours('8')
    setFormComment('')
    setFormError('')
  }

  function openEditPopup(entry) {
    setPopupMode('edit')
    setEditingEntry(entry)
    setFormDate(entry.entry_date)
    setFormProjectId(entry.project_id || '')
    setFormProcessId('')
    setFormSubProcess('')
    setFormCustomProcess('')
    setFormDayType(entry.day_type || 'working')
    setFormAllocated(String(entry.allocated_count || ''))
    setFormDone(String(entry.done_count || ''))
    setFormTarget(String(entry.target_count || ''))
    setFormWorkedHours(String(entry.worked_hours || '8'))
    setFormComment(entry.comment || '')
    setFormError('')
  }

  async function handleSaveEntry(e) {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formDate) { setFormError('Please select a date.'); return }
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    if (formDate > todayLocal) { setFormError('Date cannot be in the future.'); return }

    // Check for duplicate non-working day entries
    if (popupMode === 'add') {
      const { data: existing } = await supabase
        .from('entries')
        .select('id, day_type')
        .eq('user_id', user.id)
        .eq('entry_date', formDate)

      if (existing && existing.length > 0) {
        // If trying to add a non-working day and any entry exists for that date
        if (formDayType !== 'working') {
          setFormError('🚫 This date already has entries. A non-working day can only be the sole entry for that date.')
          setFormLoading(false)
          return
        }
        // If a non-working day already exists for this date, block any new entry
        const hasNonWorking = existing.some(e => e.day_type !== 'working')
        if (hasNonWorking) {
          const dayLabel = existing.find(e => e.day_type !== 'working')?.day_type?.replace('_', ' ') || 'non-working day'
          setFormError(`🚫 This date is already marked as a ${dayLabel}. You cannot add work entries on a non-working day.`)
          setFormLoading(false)
          return
        }
      }
    }

    // Only validate project/process for working days
    if (formDayType === 'working') {
      if (!formProjectId) { setFormError('Please select a project.'); return }
      if (popupMode === 'add' && !formProcessId) { setFormError('Please select a process.'); return }
      if (popupMode === 'add' && selectedProcess?.has_sub_process && !formSubProcess) {
        setFormError('Please select a sub-process.'); return
      }
      if (popupMode === 'add' && isOther && !formCustomProcess.trim()) {
        setFormError('Please enter the process name.'); return
      }
    }

    const isWorkingDay = formDayType === 'working'
    const allocated = parseInt(formAllocated) || 0
    const done = parseInt(formDone) || 0
    const target = parseInt(formTarget) || 0

    if (isWorkingDay) {
      if (allocated <= 0) { setFormError('Allocated count must be greater than 0.'); return }
      if (done < 0) { setFormError('Done count cannot be negative.'); return }
      if (done > allocated) { setFormError('Done count cannot be more than allocated count.'); return }
      if (target <= 0) { setFormError('Please enter a daily target.'); return }
      const hours = parseFloat(formWorkedHours)
      if (!formWorkedHours || isNaN(hours) || hours <= 0) { setFormError('Worked hours must be more than 0.'); return }
      if (hours > 8) { setFormError('Worked hours cannot exceed 8.'); return }
    }

    setFormLoading(true)
    // Status logic
    let status
    if (!isWorkingDay) {
      status = formDayType // 'weekly_off', 'leave', 'holiday'
    } else {
      status = done >= target ? 'done' : 'pending'
    }

    if (popupMode === 'add') {
      let processLabel = selectedProcess?.name || ''
      if (selectedProcess?.has_sub_process) {
        processLabel = isOther
          ? `${processLabel} — ${formCustomProcess}`
          : `${processLabel} — ${selectedSubProcess?.name || ''}`
      }
      const { error } = await supabase.from('entries').insert({
        user_id: user.id,
        project_id: isWorkingDay ? formProjectId : null,
        process: isWorkingDay ? processLabel : null,
        sub_process: isWorkingDay ? (isOther ? formCustomProcess : (selectedSubProcess?.name || null)) : null,
        entry_date: formDate,
        allocated_count: isWorkingDay ? allocated : 0,
        done_count: isWorkingDay ? done : 0,
        target_count: isWorkingDay ? target : 0,
        worked_hours: isWorkingDay ? parseFloat(formWorkedHours) : null,
        comment: formComment.trim() || null,
        day_type: formDayType, status
      })
      if (error) {
        console.error('Insert error:', error)
        setFormError('Failed to save: ' + error.message)
        setFormLoading(false)
        return
      }
    } else {
      // Edit — update counts, date, project
      const { error, data } = await supabase
        .from('entries')
        .update({
          entry_date: formDate,
          project_id: formProjectId,
          day_type: formDayType,
          allocated_count: isWorkingDay ? allocated : 0,
          done_count: isWorkingDay ? done : 0,
          target_count: isWorkingDay ? target : 0,
          worked_hours: isWorkingDay ? parseFloat(formWorkedHours) : null,
          comment: formComment.trim() || null,
          status
        })
        .eq('id', editingEntry.id)
        .eq('user_id', user.id)  // extra safety check
        .select()

      if (error) {
        setFormError('Failed to update: ' + error.message)
        setFormLoading(false)
        return
      }
    }

    setPopupMode(null)
    setFormLoading(false)
    // Reload in background — don't wait
    loadEntries()
    loadAllEntryDates()
  }

  async function handleDelete(id) {
    setDeleteId(null)
    setDeletingId(id)
    // Wait for fade-out animation then remove
    setTimeout(async () => {
      const prev = entries
      setEntries(e => e.filter(x => x.id !== id))
      setDeletingId(null)
      setCurrentPage(p => Math.max(1, Math.min(p, Math.ceil((prev.length - 1) / PAGE_SIZE))))

    // Sync with server in background
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        setEntries(prev)
        alert('Delete failed: ' + error.message)
      }
    }, 350)
  }

  // Build month buttons only from months that have entries
  function getMonthButtons() {
    const seen = new Set()
    const buttons = []
    allEntryDates.forEach(e => {
      const d = new Date(e.entry_date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!seen.has(key)) {
        seen.add(key)
        buttons.push({
          label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
          month: d.getMonth(),
          year: d.getFullYear()
        })
      }
    })
    // Always include current month even if no entries yet
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`
    if (!seen.has(currentKey)) {
      buttons.unshift({
        label: now.toLocaleString('default', { month: 'short', year: 'numeric' }),
        month: now.getMonth(),
        year: now.getFullYear()
      })
    }
    // Sort newest first
    buttons.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    return buttons
  }

  function statusBadge(status, dayType) {
    const s = { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }
    if (dayType === 'weekly_off') return <span style={{ ...s, background: '#1E293B', color: '#94A3B8' }}>Weekly Off</span>
    if (dayType === 'leave')      return <span style={{ ...s, background: '#FEF3C7', color: '#92400E' }}>Leave</span>
    if (dayType === 'holiday')    return <span style={{ ...s, background: '#EDE9FE', color: '#5B21B6' }}>Holiday</span>
    if (status === 'done')        return <span style={{ ...s, background: '#DCFCE7', color: '#166534' }}>✅ Done</span>
    return <span style={{ ...s, background: '#FEE2E2', color: '#991B1B' }}>⏳ Pending</span>
  }

  const remaining = formAllocated && formDone ? parseInt(formAllocated) - parseInt(formDone) : null

  async function exportMyData() {
    if (entries.length === 0) { alert('No data to export.'); return }
    const rows = entries.map((e, i) => ({
      'S.No': i + 1,
      'Date': e.entry_date,
      'Day': new Date(e.entry_date).toLocaleDateString('en-US', { weekday: 'long' }),
      'Day Type': e.day_type === 'working' ? 'Working Day' : e.day_type === 'weekly_off' ? 'Weekly Off' : e.day_type === 'leave' ? 'Leave' : 'Holiday',
      'Project': e.day_type === 'working' ? (e.projects?.name || '—') : '—',
      'Process': e.day_type === 'working' ? (e.process || '—') : '—',
      'Worked Hours': e.day_type === 'working' ? (e.worked_hours || 8) : 0,
      'Allocated': e.day_type === 'working' ? e.allocated_count : 0,
      'Done': e.day_type === 'working' ? e.done_count : 0,
      'Remaining': e.day_type === 'working' ? (e.allocated_count - e.done_count) : 0,
      'Status': e.status === 'done' ? 'Done' : e.status === 'pending' ? 'Pending' : e.status === 'weekly_off' ? 'Weekly Off' : e.status === 'leave' ? 'Leave' : 'Holiday',
      'Comment': e.comment || '—'
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 24 }]
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
    XLSX.utils.book_append_sheet(wb, ws, monthName)
    XLSX.writeFile(wb, `StatusLog_${userName}_${monthName.replace(' ', '_')}.xlsx`)
  }

  // Filter + Pagination
  const filteredEntries = statusFilter === 'all'
    ? entries
    : entries.filter(e => e.status === statusFilter)
  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE)
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="page-wrapper">
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Status Log</h1>
        </div>
        <div className="topbar-right">
          <span style={{ fontSize: 13, color: '#9CA3AF', letterSpacing: '0.3px' }}>
            📅 {formatDateTime(currentTime)}
          </span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="content" style={{ maxWidth: 1400 }}>
        <div className="welcome-header">
          <div>
            <h2>Welcome, {userName}! 👋</h2>
            <p>Here's your work log for the selected month</p>
          </div>
          <button className="btn-add" onClick={openAddPopup}>+ Add Entry</button>
        </div>

        <div className="month-selector">
          {getMonthButtons().map((m) => (
            <button key={`${m.month}-${m.year}`}
              className={`month-btn ${m.month === selectedMonth && m.year === selectedYear ? 'active' : ''}`}
              onClick={() => { setSelectedMonth(m.month); setSelectedYear(m.year) }}>
              {m.label}
            </button>
          ))}
          {/* Plus button to view any other month */}
          <button className="month-btn-plus" onClick={() => setShowMonthPicker(true)} title="View another month">
            +
          </button>
        </div>

        {/* Month picker popup */}
        {showMonthPicker && (
          <div className="popup-overlay" onClick={() => setShowMonthPicker(false)}>
            <div className="popup-card" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
              <div className="popup-header">
                <h3>Select Month</h3>
                <button className="popup-close" onClick={() => setShowMonthPicker(false)}>✕</button>
              </div>
              <div className="form-group">
                <label>Month</label>
                <select value={pickerMonth} onChange={e => setPickerMonth(e.target.value)}>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                    <option key={m} value={m}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Year</label>
                <select value={pickerYear} onChange={e => setPickerYear(e.target.value)}>
                  {['2024','2025','2026','2027'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" onClick={() => {
                setSelectedMonth(parseInt(pickerMonth) - 1)
                setSelectedYear(parseInt(pickerYear))
                setShowMonthPicker(false)
              }}>
                View This Month
              </button>
            </div>
          </div>
        )}

        {/* SUMMARY BAR */}
        {entries.length > 0 && (() => {
          const totalDays = entries.length
          const workingDays = entries.filter(e => e.day_type === 'working').length
          const leaves = entries.filter(e => e.day_type === 'leave').length
          const weeklyOffs = entries.filter(e => e.day_type === 'weekly_off').length
          const holidays = entries.filter(e => e.day_type === 'holiday').length
          return (
            <div className="summary-bar">
              <div className="summary-item">
                <span className="summary-label">Days Logged</span>
                <span className="summary-value">{totalDays}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-label">Working Days</span>
                <span className="summary-value" style={{ color: '#4ADE80' }}>{workingDays}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-label">Leaves</span>
                <span className="summary-value" style={{ color: '#FCD34D' }}>{leaves}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-label">Weekly Offs</span>
                <span className="summary-value" style={{ color: '#9CA3AF' }}>{weeklyOffs}</span>
              </div>
              {holidays > 0 && <>
                <div className="summary-divider" />
                <div className="summary-item">
                  <span className="summary-label">Holidays</span>
                  <span className="summary-value" style={{ color: '#C4B5FD' }}>{holidays}</span>
                </div>
              </>}
            </div>
          )
        })()}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })} — Entries
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'done', 'pending', 'weekly_off', 'leave', 'holiday'].map(f => (
                <button key={f}
                  onClick={() => { setStatusFilter(f); setCurrentPage(1) }}
                  className={statusFilter === f ? 'filter-btn active' : 'filter-btn'}>
                  {f === 'all' ? 'All' : f === 'done' ? '✅ Done' : f === 'pending' ? '⏳ Pending' : f === 'weekly_off' ? 'Weekly Off' : f === 'leave' ? 'Leave' : 'Holiday'}
                </button>
              ))}
            </div>
          </div>

          {loadingEntries ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>Loading...</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              No entries for this month yet.<br />
              <span style={{ fontSize: 13 }}>Click "+ Add Entry" to get started!</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th><th>Date</th><th>Day</th><th>Project</th><th>Process</th>
                    <th>Hours</th><th>Allocated</th><th>Done</th><th>Remaining</th><th>Status</th><th>Comment</th>{editMode && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                      No entries match this filter.
                    </td></tr>
                  ) : paginatedEntries.map((entry, i) => {
                    const rem = (entry.allocated_count || 0) - (entry.done_count || 0)
                    const isFading = deletingId === entry.id
                    return (
                      <tr key={entry.id} style={{
                        opacity: entry.day_type !== 'working' ? 0.7 : 1,
                        animation: isFading ? 'rowFadeOut 0.35s ease forwards' : undefined
                      }}>
                        <td style={{ color: '#94A3B8', fontWeight: 600 }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td>{entry.entry_date}</td>
                        <td>{new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                        <td><strong>{entry.day_type !== 'working' ? '—' : (entry.projects?.name || '—')}</strong></td>
                        <td>{entry.day_type !== 'working' ? '—' : (entry.process || '—')}</td>
                        <td>{entry.day_type !== 'working' ? '0' : (entry.worked_hours || 8)}</td>
                        <td>{entry.day_type !== 'working' ? '—' : entry.allocated_count}</td>
                        <td style={{ color: '#16A34A', fontWeight: 600 }}>{entry.day_type !== 'working' ? '—' : entry.done_count}</td>
                        <td style={{ color: rem > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{entry.day_type !== 'working' ? '—' : rem}</td>
                        <td>{statusBadge(entry.status, entry.day_type)}</td>
                        <td style={{ color: 'var(--muted)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.comment || ''}>
                          {entry.comment || '—'}
                        </td>
                        {editMode && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-edit" onClick={() => openEditPopup(entry)}>✏️ Edit</button>
                              <button className="btn-delete" onClick={() => setDeleteId(entry.id)}>🗑️ Delete</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGINATION + EDIT BUTTON */}
        {entries.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>

            {/* Pagination controls - center */}
            {totalPages > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  ← Prev
                </button>
                <span style={{ fontSize: 13, color: 'var(--muted)', padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next →
                </button>
              </div>
            ) : <div />}

            {/* Export + Edit buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportMyData}
                style={{ padding: '9px 16px', background: '#166534', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📥 Export
              </button>
              <button
                className={editMode ? 'btn-edit-mode-active' : 'btn-edit-mode'}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? '✅ Done Editing' : '✏️ Edit Entries'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT POPUP */}
      {popupMode && (
        <div className="popup-overlay" onClick={() => setPopupMode(null)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h3>{popupMode === 'add' ? 'Add New Entry' : 'Edit Entry'}</h3>
              <button className="popup-close" onClick={() => setPopupMode(null)}>✕</button>
            </div>

            {formError && <div className="error-msg">{formError}</div>}

            <form onSubmit={handleSaveEntry}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
              </div>

              {/* DAY TYPE */}
              <div className="form-group">
                <label>Day Type</label>
                <select value={formDayType} onChange={e => { setFormDayType(e.target.value); setFormProjectId(''); setFormProcessId(''); setFormSubProcess(''); setFormCustomProcess('') }}>
                  <option value="working">🏢 Working Day</option>
                  <option value="weekly_off">📅 Weekly Off</option>
                  <option value="leave">🏖️ Leave</option>
                  <option value="holiday">🎉 Holiday</option>
                </select>
              </div>

              {/* Show project/process only for working days */}
              {(formDayType === 'working') && <div className="form-group">
                <label>Project</label>
                <select value={formProjectId} onChange={e => handleProjectChange(e.target.value)} required>
                  <option value="">-- Select project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>}

              {/* Process — only shown in Add mode */}
              {popupMode === 'add' && formProjectId && (
                <div className="form-group">
                  <label>Process</label>
                  <select value={formProcessId} onChange={e => handleProcessChange(e.target.value)} required>
                    <option value="">-- Select process --</option>
                    {filteredProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {popupMode === 'add' && formProcessId && selectedProcess?.has_sub_process && (
                <div className="form-group">
                  <label>Sub-Process</label>
                  <select value={formSubProcess} onChange={e => setFormSubProcess(e.target.value)} required>
                    <option value="">-- Select sub-process --</option>
                    {filteredSubProcesses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {popupMode === 'add' && isOther && (
                <div className="form-group">
                  <label>Enter Process Name</label>
                  <input type="text" placeholder="Type the process name..."
                    value={formCustomProcess} onChange={e => setFormCustomProcess(e.target.value)} required />
                </div>
              )}

              {/* In edit mode show current process as read-only */}
              {popupMode === 'edit' && (
                <div className="form-group">
                  <label>Process</label>
                  <input type="text" value={editingEntry?.process || ''} disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
              )}

              {(formDayType === 'working') && (popupMode === 'edit' || (popupMode === 'add' && formProcessId)) && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Allocated Count</label>
                      <input type="number" placeholder="e.g. 100" value={formAllocated}
                        onChange={e => setFormAllocated(e.target.value)} min="0" required />
                    </div>
                    <div className="form-group">
                      <label>Done Count</label>
                      <input type="number" placeholder="e.g. 75" value={formDone}
                        onChange={e => setFormDone(e.target.value)} min="0" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Daily Target</label>
                    <input type="number" placeholder="e.g. 80" value={formTarget}
                      onChange={e => setFormTarget(e.target.value)} min="0" required />
                  </div>
                  <div className="form-group">
                    <label>Worked Hours <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(max 8)</span></label>
                    <input type="number" placeholder="Default: 8" value={formWorkedHours}
                      onChange={e => setFormWorkedHours(e.target.value)}
                      min="0.5" max="8" step="0.5" required />
                  </div>
                  <div className="form-group">
                    <label>Comment <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
                    <input type="text" placeholder="Add a note about this entry..."
                      value={formComment} onChange={e => setFormComment(e.target.value)} />
                  </div>
                  {remaining !== null && (
                    <div className="remaining-preview">
                      Remaining: <strong style={{ color: remaining > 0 ? '#DC2626' : '#16A34A' }}>{remaining}</strong>
                      {formTarget && formDone && (
                        <span style={{ marginLeft: 16 }}>
                          vs Target: <strong style={{ color: parseInt(formDone) >= parseInt(formTarget) ? '#16A34A' : '#DC2626' }}>
                            {parseInt(formDone) >= parseInt(formTarget) ? '✅ Done' : '⏳ Pending'}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              <button className="btn-primary" type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : popupMode === 'add' ? 'Save Entry' : 'Update Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM POPUP */}
      {deleteId && (
        <div className="popup-overlay" onClick={() => setDeleteId(null)}>
          <div className="popup-card" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ marginBottom: 8 }}>Delete this entry?</h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-logout" style={{ padding: '10px 24px' }} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px', background: '#DC2626' }}
                onClick={() => handleDelete(deleteId)}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
