import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Crimson+Text:wght@700&display=swap'
document.head.appendChild(fontLink)
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const now = new Date()

  const [adminName, setAdminName] = useState('')
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('dashTab') || 'summary')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [pickerYear, setPickerYear] = useState(String(now.getFullYear()))
  const [employees, setEmployees] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])

  // Drill down
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [empEntries, setEmpEntries] = useState([])
  const [loadingEmp, setLoadingEmp] = useState(false)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 12

  // Create employee
  const [showCreateEmp, setShowCreateEmp] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('employee')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Delete employee
  const [deleteEmpId, setDeleteEmpId] = useState(null)

  // Reset password
  const [resetEmp, setResetEmp] = useState(null)
  const [newResetPass, setNewResetPass] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  // Edit employee
  const [editEmp, setEditEmp] = useState(null)
  const [editName, setEditName] = useState('')
  const [editNewPassword, setEditNewPassword] = useState('')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Show password per employee row
  const [showPassFor, setShowPassFor] = useState(null)
  const [empPasswords, setEmpPasswords] = useState({})

  // Settings tab data
  const [allProcesses, setAllProcesses] = useState([])
  const [allSubProcesses, setAllSubProcesses] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [projectMsg, setProjectMsg] = useState({ text: '', ok: true })
  const [newProcessName, setNewProcessName] = useState('')
  const [newProcessProjectId, setNewProcessProjectId] = useState('')
  const [newProcessHasSub, setNewProcessHasSub] = useState(false)
  const [processMsg, setProcessMsg] = useState({ text: '', ok: true })
  const [newSubName, setNewSubName] = useState('')
  const [newSubProcessId, setNewSubProcessId] = useState('')
  const [newSubIsOther, setNewSubIsOther] = useState(false)
  const [subMsg, setSubMsg] = useState({ text: '', ok: true })

  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => { loadAdminName(); loadProjects() }, [])
  useEffect(() => { if (activeTab === 'settings') loadSettingsData() }, [activeTab])
  useEffect(() => { loadDashboardData() }, [selectedMonth, selectedYear])
  useEffect(() => {
    const interval = setInterval(loadDashboardData, 60000)
    return () => clearInterval(interval)
  }, [selectedMonth, selectedYear])
  useEffect(() => {
    if (selectedEmployee) loadEmpEntries(selectedEmployee.id)
  }, [selectedEmployee, selectedMonth, selectedYear])

  async function loadAdminName() {
    const { data } = await supabase.from('users').select('name').eq('id', user.id).single()
    setAdminName(data?.name || 'Admin')
  }

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('*').order('name')
    setProjects(data || [])
  }

  async function loadSettingsData() {
    const [{ data: proj }, { data: proc }, { data: sub }] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('processes').select('*').order('name'),
      supabase.from('sub_processes').select('*').order('name')
    ])
    setProjects(proj || [])
    setAllProcesses(proc || [])
    setAllSubProcesses(sub || [])
  }

  async function addProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    const { error } = await supabase.from('projects').insert({ name: newProjectName.trim() })
    if (error) { setProjectMsg({ text: 'Error: ' + error.message, ok: false }); return }
    setProjectMsg({ text: '✅ Project added!', ok: true })
    setNewProjectName('')
    loadSettingsData()
  }

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id)
    loadSettingsData()
  }

  async function addProcess(e) {
    e.preventDefault()
    if (!newProcessName.trim() || !newProcessProjectId) return
    const { error } = await supabase.from('processes').insert({ name: newProcessName.trim(), project_id: newProcessProjectId, has_sub_process: newProcessHasSub })
    if (error) { setProcessMsg({ text: 'Error: ' + error.message, ok: false }); return }
    setProcessMsg({ text: '✅ Process added!', ok: true })
    setNewProcessName(''); setNewProcessProjectId(''); setNewProcessHasSub(false)
    loadSettingsData()
  }

  async function deleteProcess(id) {
    await supabase.from('processes').delete().eq('id', id)
    loadSettingsData()
  }

  async function addSubProcess(e) {
    e.preventDefault()
    if (!newSubName.trim() || !newSubProcessId) return
    const { error } = await supabase.from('sub_processes').insert({ name: newSubName.trim(), process_id: newSubProcessId, is_other: newSubIsOther })
    if (error) { setSubMsg({ text: 'Error: ' + error.message, ok: false }); return }
    setSubMsg({ text: '✅ Sub-process added!', ok: true })
    setNewSubName(''); setNewSubProcessId(''); setNewSubIsOther(false)
    loadSettingsData()
  }

  async function deleteSubProcess(id) {
    await supabase.from('sub_processes').delete().eq('id', id)
    loadSettingsData()
  }

  async function loadDashboardData() {
    setLoading(true)
    const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`
    const [{ data: empData }, { data: entryData }] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('entries').select('*, users(name), projects(name)').gte('entry_date', start).lte('entry_date', end)
    ])
    setEmployees(empData || [])
    setAllEntries(entryData || [])
    setLoading(false)
  }

  async function loadEmpEntries(empId) {
    setLoadingEmp(true); setCurrentPage(1)
    const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`
    const { data } = await supabase.from('entries').select('*, projects(name)')
      .eq('user_id', empId).gte('entry_date', start).lte('entry_date', end)
      .order('entry_date', { ascending: false })
    setEmpEntries(data || [])
    setLoadingEmp(false)
  }

  async function createEmployee(e) {
    e.preventDefault()
    setCreateError(''); setCreateSuccess(''); setCreateLoading(true)

    // Save admin session before creating employee
    const { data: adminSession } = await supabase.auth.getSession()

    const { data, error: signupError } = await supabase.auth.signUp({ email: newEmail, password: newPassword })
    if (signupError) { setCreateError(signupError.message); setCreateLoading(false); return }

    const { error: insertError } = await supabase.from('users').insert({ id: data.user.id, name: newName, email: newEmail, role: newRole, password_hint: newPassword })
    if (insertError) { setCreateError('Profile save failed: ' + insertError.message); setCreateLoading(false); return }

    // Restore admin session immediately so admin doesn't get redirected
    if (adminSession?.session) {
      await supabase.auth.setSession({
        access_token: adminSession.session.access_token,
        refresh_token: adminSession.session.refresh_token
      })
    }

    setCreateSuccess(`✅ ${newRole === 'admin' ? 'Admin' : 'Employee'} account created for ${newName}!`)
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('employee')
    setCreateLoading(false)
    loadDashboardData()
  }

  async function resetPassword(e) {
    e.preventDefault()
    setResetError(''); setResetSuccess(''); setResetLoading(true)

    // Use Supabase admin to update password
    const { error } = await supabase.auth.admin.updateUserById(resetEmp.id, { password: newResetPass })

    if (error) {
      // Fallback: store new password hint in users table metadata
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hint: newResetPass })
        .eq('id', resetEmp.id)

      if (updateError) {
        setResetError('Failed to reset password. Please try from Supabase dashboard.')
        setResetLoading(false)
        return
      }
    }

    setResetSuccess(`✅ Password reset successfully for ${resetEmp.name}!`)
    setNewResetPass('')
    setResetLoading(false)
  }

  async function updateEmployee(e) {
    e.preventDefault()
    setEditError(''); setEditSuccess(''); setEditLoading(true)

    // Update name in users table
    const updateData = { name: editName }
    if (editNewPassword) updateData.password_hint = editNewPassword

    const { error } = await supabase.from('users').update(updateData).eq('id', editEmp.id)
    if (error) { setEditError('Failed to update name: ' + error.message); setEditLoading(false); return }

    // Update actual auth password via Edge Function
    if (editNewPassword) {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId: editEmp.id, newPassword: editNewPassword })
        }
      )
      const result = await res.json()
      if (result.error) {
        setEditError('Name updated but password failed: ' + result.error)
        setEditLoading(false)
        return
      }
    }

    setEmployees(prev => prev.map(emp =>
      emp.id === editEmp.id ? { ...emp, name: editName } : emp
    ))

    setEditSuccess('✅ Updated successfully!' + (editNewPassword ? ' Password changed.' : ''))
    setEditLoading(false)
  }

  async function deleteEmployee(empId) {
    // Delete entries first
    await supabase.from('entries').delete().eq('user_id', empId)

    // Delete from users table
    await supabase.from('users').delete().eq('id', empId)

    // Delete from Supabase Auth via Edge Function
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: empId })
      }
    )

    setDeleteEmpId(null)
    loadDashboardData()
  }

  const employeesOnly = employees.filter(e => e.role !== 'admin')

  function getEmpStats(empId) {
    const empAll = allEntries.filter(e => e.user_id === empId)
    const working = empAll.filter(e => e.day_type === 'working')
    const allocated = working.reduce((s, e) => s + (e.allocated_count || 0), 0)
    const done = working.reduce((s, e) => s + (e.done_count || 0), 0)
    const target = working.reduce((s, e) => s + (e.target_count || 0), 0)
    const production = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : allocated > 0 ? Math.min(100, Math.round((done / allocated) * 100)) : 0
    return { allocated, done, remaining: allocated - done, production, allDays: empAll.length, loggedToday: empAll.some(e => e.entry_date === todayStr) }
  }

  function statusBadge(status, dayType) {
    if (dayType === 'weekly_off') return <span className="badge badge-gray">Weekly Off</span>
    if (dayType === 'leave')      return <span className="badge badge-yellow">Leave</span>
    if (dayType === 'holiday')    return <span className="badge badge-purple">Holiday</span>
    if (status === 'done')        return <span className="badge badge-green">✅ Done</span>
    return <span className="badge badge-red">⏳ Pending</span>
  }

  const filteredEmpEntries = empEntries.filter(e => {
    if (filterProject && e.project_id !== filterProject) return false
    if (filterStatus && e.status !== filterStatus) return false
    return true
  })
  const totalPages = Math.ceil(filteredEmpEntries.length / PAGE_SIZE)
  const paginatedEntries = filteredEmpEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function exportToExcel(empId, empName) {
    const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`

    const { data: entries } = await supabase
      .from('entries')
      .select('*, users(name, email), projects(name)')
      .eq('user_id', empId)
      .gte('entry_date', start)
      .lte('entry_date', end)
      .order('entry_date', { ascending: true })

    if (!entries || entries.length === 0) {
      alert('No data to export for this month.')
      return
    }

    // Format data for Excel
    const rows = entries.map((e, i) => ({
      'S.No': i + 1,
      'Employee Name': e.users?.name || '—',
      'Employee Email': e.users?.email || '—',
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

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
      { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 24 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, monthLabel)
    XLSX.writeFile(wb, `StatusLog_${empName.replace(' ', '_')}_${monthLabel.replace(' ', '_')}.xlsx`)
  }

  const monthButtons = (() => {
    const seen = new Set()
    const buttons = []
    allEntries.forEach(e => {
      const d = new Date(e.entry_date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!seen.has(key)) {
        seen.add(key)
        buttons.push({ label: d.toLocaleString('default', { month: 'short', year: 'numeric' }), month: d.getMonth(), year: d.getFullYear() })
      }
    })
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`
    if (!seen.has(currentKey)) buttons.unshift({ label: now.toLocaleString('default', { month: 'short', year: 'numeric' }), month: now.getMonth(), year: now.getFullYear() })
    buttons.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    return buttons
  })()

  return (
    <div className="db-wrapper">

      {/* TOP BAR */}
      <div className="db-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', fontFamily: "'Playfair Display', serif", letterSpacing: '0px' }}>Admin Dashboard</h1>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', fontFamily: "'Crimson Text', serif" }}>Welcome, {adminName}! 👋</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>{todayStr}</span>
          <button className="btn-logout db-mobile-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="db-body">

        {/* LEFT SIDEBAR */}
        <div className="db-sidebar">
          <nav className="db-nav">
            <button className={`db-nav-item ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => { setActiveTab('summary'); localStorage.setItem('dashTab', 'summary'); setSelectedEmployee(null) }}>
              <span className="db-nav-icon">📊</span><span>Team Stats</span>
            </button>
            <button className={`db-nav-item ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => { setActiveTab('employees'); localStorage.setItem('dashTab', 'employees') }}>
              <span className="db-nav-icon">👥</span><span>Access Control</span>
            </button>
            <button className={`db-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setActiveTab('settings'); localStorage.setItem('dashTab', 'settings') }}>
              <span className="db-nav-icon">⚙️</span><span>Data Setup</span>
            </button>
          </nav>

          <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Month</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {monthButtons.map(m => (
                <button key={`${m.month}-${m.year}`}
                  className={`db-month-item ${m.month === selectedMonth && m.year === selectedYear ? 'active' : ''}`}
                  onClick={() => { setSelectedMonth(m.month); setSelectedYear(m.year); setSelectedEmployee(null) }}>
                  {m.label}
                </button>
              ))}
              <button className="db-month-item" style={{ color: '#6366F1', borderStyle: 'dashed' }}
                onClick={() => setShowMonthPicker(true)}>+ Other month</button>
            </div>
          </div>
          {/* ADMIN INFO + LOGOUT - pinned to bottom */}
          <div style={{ marginTop: 'auto', padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div className="emp-avatar" style={{ width: 36, height: 36, fontSize: 15, background: '#374151', flexShrink: 0 }}>
                {adminName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>{adminName}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Administrative</div>
              </div>
            </div>
            <button className="btn-logout" style={{ width: '100%', textAlign: 'center' }} onClick={logout}>
              Logout
            </button>
          </div>

        </div>

        {/* MAIN CONTENT */}
        <div className="db-content">

          {/* SUMMARY TAB */}
          {activeTab === 'summary' && !selectedEmployee && (
            <>
              <div className="db-content-header">
                <h3>{monthLabel} — Employee Summary</h3>
                <button className="btn-refresh" onClick={async () => {
                  await loadDashboardData()
                  if (selectedEmployee) await loadEmpEntries(selectedEmployee.id)
                }} title="Refresh">↻</button>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>S.No</th><th>Employee</th><th>Days Logged</th><th>Logged Today</th><th>Production</th><th>View</th></tr>
                    </thead>
                    <tbody>
                      {employeesOnly.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                          No employees found. Add one from the Employees tab.
                        </td></tr>
                      ) : employeesOnly.map((emp, i) => {
                        const stats = getEmpStats(emp.id)
                        return (
                          <tr key={emp.id}>
                            <td style={{ color: '#6B7280' }}>{i + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="emp-avatar">{emp.name.charAt(0).toUpperCase()}</div>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{emp.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>{stats.allDays}</td>
                            <td>{stats.loggedToday ? <span className="badge badge-green">✅ Yes</span> : <span className="badge badge-red">❌ No</span>}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="progress-bar-bg" style={{ width: 80 }}>
                                  <div className="progress-bar-fill" style={{ width: `${stats.production}%` }} />
                                </div>
                                <span style={{ fontSize: 13, color: '#9CA3AF' }}>{stats.production}%</span>
                              </div>
                            </td>
                            <td><button className="btn-edit" onClick={() => setSelectedEmployee(emp)}>👁 View</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* DRILL DOWN */}
          {activeTab === 'summary' && selectedEmployee && (
            <>
              <div className="db-content-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => { setSelectedEmployee(null); setFilterProject(''); setFilterStatus('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>← Back</button>
                  <div className="emp-avatar">{selectedEmployee.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedEmployee.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{selectedEmployee.email} · {monthLabel}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => exportToExcel(selectedEmployee.id, selectedEmployee.name)}
                    style={{ background: '#166534', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📥 Export Excel
                  </button>
                  <select className="filter-select" value={filterProject} onChange={e => { setFilterProject(e.target.value); setCurrentPage(1) }}>
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select className="filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
                    <option value="">All Status</option>
                    <option value="done">Done</option>
                    <option value="pending">Pending</option>
                    <option value="weekly_off">Weekly Off</option>
                    <option value="leave">Leave</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>
              </div>
              {loadingEmp ? (
                <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr><th>S.No</th><th>Date</th><th>Day</th><th>Project</th><th>Process</th><th>Hours</th><th>Allocated</th><th>Done</th><th>Remaining</th><th>Status</th><th>Comment</th></tr>
                      </thead>
                      <tbody>
                        {paginatedEntries.length === 0 ? (
                          <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                            No entries found for this filter.
                          </td></tr>
                        ) : paginatedEntries.map((entry, i) => {
                          const rem = (entry.allocated_count || 0) - (entry.done_count || 0)
                          return (
                            <tr key={entry.id} style={{
                              opacity: entry.day_type !== 'working' ? 0.7 : 1,
                              background: entry.entry_date === todayStr ? 'rgba(99,102,241,0.22)' : '',
                              borderLeft: entry.entry_date === todayStr ? '4px solid #818CF8' : '4px solid transparent'
                            }}>
                              <td style={{ color: '#6B7280' }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                              <td>{entry.entry_date}</td>
                              <td>{new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'short' })}</td>
                              <td><strong>{entry.day_type !== 'working' ? '—' : (entry.projects?.name || '—')}</strong></td>
                              <td>{entry.day_type !== 'working' ? '—' : (entry.process || '—')}</td>
                              <td style={{ color: '#9CA3AF' }}>{entry.day_type !== 'working' ? '0' : (entry.worked_hours || 8)}</td>
                              <td>{entry.day_type !== 'working' ? '—' : entry.allocated_count}</td>
                              <td style={{ color: '#4ADE80', fontWeight: 600 }}>{entry.day_type !== 'working' ? '—' : entry.done_count}</td>
                              <td style={{ color: rem > 0 ? '#F87171' : '#4ADE80', fontWeight: 600 }}>{entry.day_type !== 'working' ? '—' : rem}</td>
                              <td>{statusBadge(entry.status, entry.day_type)}</td>
                              <td style={{ color: 'var(--muted)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.comment || ''}>
                                {entry.comment || '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
                      <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
                      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: '34px' }}>Page {currentPage} of {totalPages}</span>
                      <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* EMPLOYEES TAB */}
          {activeTab === 'employees' && (
            <>
              <div className="db-content-header">
                <h3>Manage Employees</h3>
                <button className="btn-add" onClick={() => { setShowCreateEmp(true); setCreateError(''); setCreateSuccess('') }}>+ Add User</button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>S.No</th><th>Name</th><th>Email</th><th>Password</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No employees yet.</td></tr>
                    ) : employees.map((emp, i) => (
                      <tr key={emp.id}>
                        <td style={{ color: '#6B7280' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="emp-avatar" style={{ width: 30, height: 30, fontSize: 13 }}>{emp.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{emp.name}</span>
                              {emp.role === 'admin' && <span style={{ marginLeft: 6, fontSize: 11, background: 'rgba(99,102,241,0.2)', color: '#818CF8', padding: '2px 6px', borderRadius: 10 }}>👑 Admin</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted)' }}>{emp.email}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: showPassFor === emp.id ? 0 : 2 }}>
                              {showPassFor === emp.id ? (emp.password_hint || '(not stored)') : '••••••••'}
                            </span>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}
                              onClick={() => setShowPassFor(showPassFor === emp.id ? null : emp.id)}>
                              {showPassFor === emp.id ? '🔒' : '👁'}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-edit" onClick={() => { setEditEmp(emp); setEditName(emp.name); setEditNewPassword(''); setEditError(''); setEditSuccess('') }}>🔑 Reset</button>
<button className="btn-delete" onClick={() => setDeleteEmpId(emp.id)}>🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <>
              <div className="db-content-header">
                <h3>⚙️ Manage Projects & Processes</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

                {/* PROJECTS */}
                <div className="settings-card">
                  <h4 className="settings-card-title">📁 Projects</h4>
                  <form onSubmit={addProject} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input className="settings-input" type="text" placeholder="New project name"
                      value={newProjectName} onChange={e => { setNewProjectName(e.target.value); setProjectMsg({ text: '', ok: true }) }} required />
                    <button className="settings-add-btn" type="submit">+</button>
                  </form>
                  {projectMsg.text && <p style={{ fontSize: 12, color: projectMsg.ok ? '#4ADE80' : '#F87171', marginBottom: 8 }}>{projectMsg.text}</p>}
                  <div className="settings-list">
                    {projects.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>No projects yet.</p>}
                    {projects.map(p => (
                      <div key={p.id} className="settings-list-item">
                        <span>{p.name}</span>
                        <button className="settings-del-btn" onClick={() => deleteProject(p.id)}>🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PROCESSES */}
                <div className="settings-card">
                  <h4 className="settings-card-title">🔧 Processes</h4>
                  <form onSubmit={addProcess} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select className="settings-input" value={newProcessProjectId} onChange={e => { setNewProcessProjectId(e.target.value); setProcessMsg({ text: '', ok: true }) }} required>
                      <option value="">Select project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="settings-input" type="text" placeholder="Process name"
                        value={newProcessName} onChange={e => setNewProcessName(e.target.value)} required />
                      <button className="settings-add-btn" type="submit">+</button>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newProcessHasSub} onChange={e => setNewProcessHasSub(e.target.checked)} />
                      Has sub-processes
                    </label>
                  </form>
                  {processMsg.text && <p style={{ fontSize: 12, color: processMsg.ok ? '#4ADE80' : '#F87171', marginBottom: 8 }}>{processMsg.text}</p>}
                  <div className="settings-list">
                    {allProcesses.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>No processes yet.</p>}
                    {allProcesses.map(p => {
                      const proj = projects.find(pr => pr.id === p.project_id)
                      return (
                        <div key={p.id} className="settings-list-item">
                          <div>
                            <div style={{ fontSize: 13 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{proj?.name} {p.has_sub_process ? '· has subs' : ''}</div>
                          </div>
                          <button className="settings-del-btn" onClick={() => deleteProcess(p.id)}>🗑️</button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* SUB-PROCESSES */}
                <div className="settings-card">
                  <h4 className="settings-card-title">🔹 Sub-Processes</h4>
                  <form onSubmit={addSubProcess} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select className="settings-input" value={newSubProcessId} onChange={e => { setNewSubProcessId(e.target.value); setSubMsg({ text: '', ok: true }) }} required>
                      <option value="">Select process</option>
                      {allProcesses.filter(p => p.has_sub_process).map(p => {
                        const proj = projects.find(pr => pr.id === p.project_id)
                        return <option key={p.id} value={p.id}>{proj?.name} → {p.name}</option>
                      })}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="settings-input" type="text" placeholder="Sub-process name"
                        value={newSubName} onChange={e => setNewSubName(e.target.value)} required />
                      <button className="settings-add-btn" type="submit">+</button>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newSubIsOther} onChange={e => setNewSubIsOther(e.target.checked)} />
                      Mark as "Other" (free text)
                    </label>
                  </form>
                  {subMsg.text && <p style={{ fontSize: 12, color: subMsg.ok ? '#4ADE80' : '#F87171', marginBottom: 8 }}>{subMsg.text}</p>}
                  <div className="settings-list">
                    {allSubProcesses.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>No sub-processes yet.</p>}
                    {allSubProcesses.map(s => {
                      const proc = allProcesses.find(p => p.id === s.process_id)
                      return (
                        <div key={s.id} className="settings-list-item">
                          <div>
                            <div style={{ fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{proc?.name} {s.is_other ? '· other' : ''}</div>
                          </div>
                          <button className="settings-del-btn" onClick={() => deleteSubProcess(s.id)}>🗑️</button>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </div>

      {/* MONTH PICKER */}
      {showMonthPicker && (
        <div className="popup-overlay" onClick={() => setShowMonthPicker(false)}>
          <div className="popup-card" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <div className="popup-header"><h3>Select Month</h3><button className="popup-close" onClick={() => setShowMonthPicker(false)}>✕</button></div>
            <div className="form-group">
              <label>Month</label>
              <select value={pickerMonth} onChange={e => setPickerMonth(e.target.value)}>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                  <option key={m} value={m}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Year</label>
              <select value={pickerYear} onChange={e => setPickerYear(e.target.value)}>
                {['2024','2025','2026','2027'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={() => { setSelectedMonth(parseInt(pickerMonth) - 1); setSelectedYear(parseInt(pickerYear)); setShowMonthPicker(false); setSelectedEmployee(null) }}>View This Month</button>
          </div>
        </div>
      )}

      {/* CREATE EMPLOYEE */}
      {showCreateEmp && (
        <div className="popup-overlay" onClick={() => setShowCreateEmp(false)}>
          <div className="popup-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="popup-header"><h3>Add New User</h3><button className="popup-close" onClick={() => setShowCreateEmp(false)}>✕</button></div>
            {createError && <div className="error-msg">{createError}</div>}
            {createSuccess && <div className="success-msg">{createSuccess}</div>}
            <form onSubmit={createEmployee}>
              <div className="form-group"><label>Full Name</label><input type="text" placeholder="Employee's full name" value={newName} onChange={e => setNewName(e.target.value)} required /></div>
              <div className="form-group"><label>Email</label><input type="email" placeholder="employee@company.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></div>
              <div className="form-group">
                <label>Password</label>
                <input type="text" placeholder="Set a password for them" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                <small style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, display: 'block' }}>Share this with the user so they can login.</small>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="employee">👤 Employee</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
              <button className="btn-primary" type="submit" disabled={createLoading}>{createLoading ? 'Creating...' : 'Create Account'}</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE */}
      {editEmp && (
        <div className="popup-overlay" onClick={() => setEditEmp(null)}>
          <div className="popup-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="popup-header"><h3>Edit Employee</h3><button className="popup-close" onClick={() => setEditEmp(null)}>✕</button></div>
            {editError && <div className="error-msg">{editError}</div>}
            {editSuccess && <div className="success-msg">{editSuccess}</div>}
            <form onSubmit={updateEmployee}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="text" value={editEmp.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                <small style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, display: 'block' }}>Email cannot be changed.</small>
              </div>
              <div className="form-group">
                <label>New Password <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                <input type="text" placeholder="Enter new password (min 6 chars)"
                  value={editNewPassword} onChange={e => setEditNewPassword(e.target.value)} minLength={6} />
              </div>
              <button className="btn-primary" type="submit" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD */}
      {resetEmp && (
        <div className="popup-overlay" onClick={() => setResetEmp(null)}>
          <div className="popup-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Reset Password</h3>
              <button className="popup-close" onClick={() => setResetEmp(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Setting new password for <strong style={{ color: 'var(--text)' }}>{resetEmp?.name}</strong>
            </p>
            {resetError && <div className="error-msg">{resetError}</div>}
            {resetSuccess && <div className="success-msg">{resetSuccess}</div>}
            {!resetSuccess && (
              <form onSubmit={resetPassword}>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="text" placeholder="Enter new password (min 6 chars)"
                    value={newResetPass} onChange={e => setNewResetPass(e.target.value)}
                    required minLength={6} />
                  <small style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, display: 'block' }}>
                    Share this new password with the employee.
                  </small>
                </div>
                <button className="btn-primary" type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteEmpId && (
        <div className="popup-overlay" onClick={() => setDeleteEmpId(null)}>
          <div className="popup-card" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ marginBottom: 8 }}>Delete this employee?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>This will permanently delete their account and all entries.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-logout" style={{ padding: '10px 24px' }} onClick={() => setDeleteEmpId(null)}>Cancel</button>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px', background: '#DC2626' }} onClick={() => deleteEmployee(deleteEmpId)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}
