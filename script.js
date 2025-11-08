/* Advanced Attendance Dashboard - script.js
   Features: CSV upload, manual entry, search/filter/sort, KPIs, charts, localStorage, download CSV, robust PDF export, modal details, dark mode
*/

let students = []; // array of {id,name,dept,total,attended}
let deptChart, trendChart;
let sortNameAsc = true, sortAttendanceAsc = false;

// DOM refs
const csvFile = document.getElementById("csvFile");
const generateBtn = document.getElementById("generateBtn");
const loadSample = document.getElementById("loadSample");
const searchInput = document.getElementById("searchInput");
const deptFilter = document.getElementById("deptFilter");
const statusFilter = document.getElementById("statusFilter");
const addRecordBtn = document.getElementById("addRecordBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const exportPDFBtn = document.getElementById("exportPDF");
const clearStorage = document.getElementById("clearStorage");
const themeToggle = document.getElementById("themeToggle");

const tbody = document.querySelector("#attendanceTable tbody");
const rowsInfo = document.getElementById("rowsInfo");
const kpiContainer = document.getElementById("kpiContainer");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

// Load saved data from localStorage if present
function loadFromStorage(){
  const raw = localStorage.getItem("attendanceData_v1");
  if(raw){
    try{
      students = JSON.parse(raw);
      updateDeptFilterOptions();
      renderAll();
    }catch(e){ console.warn("Failed to parse saved data", e); }
  }
}
loadFromStorage();

// CSV parsing
csvFile.addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    const text = ev.target.result;
    parseCSV(text);
    updateDeptFilterOptions();
    renderAll();
    saveToStorage();
  };
  reader.readAsText(file);
});

// Sample loader
loadSample.addEventListener("click", ()=>{
  const sample = `StudentID,Name,Department,Total_Classes,Attended_Classes
101,Amit Kumar,MCA,30,28
102,Priya Sharma,MCA,30,24
103,Rahul Verma,B.Tech,30,18
104,Sneha Gupta,MCA,30,30
105,Rohan Singh,B.Tech,30,21
106,Neha Yadav,BCA,30,29
107,Arjun Mehta,B.Tech,30,22
108,Kriti Patel,MCA,30,26
109,Vikram Chauhan,BCA,30,20
110,Simran Kaur,B.Tech,30,27`;
  parseCSV(sample);
  updateDeptFilterOptions();
  renderAll();
  saveToStorage();
});

// Parse CSV text -> students array
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const header = lines.shift(); // ignore header
  students = lines.map(line=>{
    const parts = line.split(",").map(p=>p.trim());
    // handle if name contains comma by joining middle elements (simple heuristic)
    if(parts.length>5){
      // assume ID is first, dept is at index -3, total -2, attended -1
      const id = parts[0];
      const attended = Number(parts.pop());
      const total = Number(parts.pop());
      const dept = parts.pop();
      const name = parts.slice(1).join(",");
      return { id, name, dept, total, attended };
    }else{
      const [id,name,dept,total,attended] = parts;
      return { id, name, dept, total: Number(total), attended: Number(attended) };
    }
  });
}

// Add manual record
addRecordBtn.addEventListener("click", ()=>{
  const id = document.getElementById("id").value.trim();
  const name = document.getElementById("name").value.trim();
  const dept = document.getElementById("dept").value.trim();
  const total = Number(document.getElementById("total").value);
  const attended = Number(document.getElementById("attended").value);

  if(!id||!name||!dept||!total||isNaN(attended)){
    alert("Please fill all fields correctly.");
    return;
  }
  if(attended>total){
    alert("Attended cannot exceed total classes.");
    return;
  }
  students.push({id,name,dept,total,attended});
  updateDeptFilterOptions();
  renderAll();
  saveToStorage();
  // clear inputs
  ["id","name","dept","total","attended"].forEach(i=>document.getElementById(i).value="");
});

// Generate button
generateBtn.addEventListener("click", ()=>{
  if(!students.length){ alert("No data — upload CSV or load sample / add records."); return; }
  renderAll();
  saveToStorage();
});

// Search / filters
[searchInput, deptFilter, statusFilter].forEach(el=>el.addEventListener("input", ()=> renderTable()));

// Sorting buttons
document.getElementById("sortName").addEventListener("click", ()=>{
  sortNameAsc = !sortNameAsc;
  students.sort((a,b)=> sortNameAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  renderTable();
});
document.getElementById("sortAttendance").addEventListener("click", ()=>{
  sortAttendanceAsc = !sortAttendanceAsc;
  students.sort((a,b)=> {
    const pa = (a.attended/a.total)*100;
    const pb = (b.attended/b.total)*100;
    return sortAttendanceAsc ? pa-pb : pb-pa;
  });
  renderTable();
});

// Download updated CSV
downloadCsvBtn.addEventListener("click", ()=> {
  if(!students.length){ alert("No data to download"); return; }
  const header = ["StudentID","Name","Department","Total_Classes","Attended_Classes"];
  const rows = students.map(s => [s.id, s.name, s.dept, s.total, s.attended].map(v=>String(v).includes(",")?`"${v}"`:v).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance_updated.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Clear storage
clearStorage.addEventListener("click", ()=> {
  if(confirm("Clear saved dashboard data from browser?")) {
    localStorage.removeItem("attendanceData_v1");
    students = [];
    renderAll();
  }
});

// Modal close
modalClose.addEventListener("click", ()=> { modal.style.display = "none"; });
modal.addEventListener("click", (e)=> { if(e.target===modal) modal.style.display="none"; });

// Theme toggle
themeToggle.addEventListener("change", ()=>{
  if(themeToggle.checked){
    document.documentElement.style.setProperty('--card','#0f1724');
    document.documentElement.style.setProperty('--bg','#0b1220');
    document.documentElement.style.setProperty('--text','#e6eefc');
    document.documentElement.style.setProperty('--muted','#9fb2d8');
    document.documentElement.style.setProperty('--primary','#1f8fff');
  }else{
    // restore defaults by removing inline properties
    document.documentElement.style.removeProperty('--card');
    document.documentElement.style.removeProperty('--bg');
    document.documentElement.style.removeProperty('--text');
    document.documentElement.style.removeProperty('--muted');
    document.documentElement.style.removeProperty('--primary');
  }
});

// Save to localStorage
function saveToStorage(){ localStorage.setItem("attendanceData_v1", JSON.stringify(students)); }

// Update dept filter options
function updateDeptFilterOptions(){
  const depts = Array.from(new Set(students.map(s=>s.dept))).filter(Boolean);
  deptFilter.innerHTML = `<option value="">All Departments</option>` + depts.map(d=>`<option value="${d}">${d}</option>`).join("");
}

// Render all: KPIs, table, charts
function renderAll(){
  renderKPIs();
  renderTable();
  renderCharts();
}

// Render KPIs
function renderKPIs(){
  if(!students.length){ kpiContainer.innerHTML = ""; return; }
  const totalStudents = students.length;
  const avg = (students.reduce((a,s)=>a + (s.attended/s.total)*100,0)/totalStudents).toFixed(1);
  const defaulters = students.filter(s => (s.attended/s.total)*100 < 75).length;
  const top = [...students].sort((a,b)=> (b.attended/b.total)-(a.attended/a.total)).slice(0,1)[0];
  kpiContainer.innerHTML = `
    <div class="kpi">Avg: <strong>${avg}%</strong></div>
    <div class="kpi">Students: <strong>${totalStudents}</strong></div>
    <div class="kpi">Defaulters: <strong>${defaulters}</strong></div>
    <div class="kpi">Top: <strong>${top?top.name:'N/A'}</strong></div>
  `;
}

// Render table with search & filters
function renderTable(){
  tbody.innerHTML = "";
  const q = searchInput.value.trim().toLowerCase();
  const dept = deptFilter.value;
  const status = statusFilter.value;

  let filtered = students.filter(s=>{
    if(q){
      if(!(s.id.toLowerCase().includes(q) || (s.name||"").toLowerCase().includes(q) || (s.dept||"").toLowerCase().includes(q))) return false;
    }
    if(dept && s.dept !== dept) return false;
    if(status){
      const p = (s.attended/s.total)*100;
      if(status === "low" && p>=75) return false;
      if(status === "medium" && (p<75 || p>85)) return false;
      if(status === "high" && p<=85) return false;
    }
    return true;
  });

  rowsInfo.textContent = `Showing ${filtered.length} of ${students.length} rows`;

  filtered.forEach(s=>{
    const p = ((s.attended/s.total)*100).toFixed(1);
    const tr = document.createElement("tr");
    if(p < 75) tr.className = "low-attendance";
    else if(p <= 85) tr.className = "mid-attendance";
    else tr.className = "high-attendance";

    tr.innerHTML = `<td>${s.id}</td>
                    <td class="linkCell">${escapeHtml(s.name)}</td>
                    <td>${escapeHtml(s.dept)}</td>
                    <td>${s.total}</td>
                    <td>${s.attended}</td>
                    <td>${p}%</td>`;
    // open modal on name click
    tr.querySelector(".linkCell").addEventListener("click", ()=> openModal(s));
    tbody.appendChild(tr);
  });
}

// escape HTML
function escapeHtml(unsafe){ return unsafe.replace(/[&<"'>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m])); }

// open modal details
function openModal(s){
  const p = ((s.attended/s.total)*100).toFixed(1);
  modalBody.innerHTML = `
    <h2>${escapeHtml(s.name)} <small style="color:#666">(${s.id})</small></h2>
    <p><strong>Department:</strong> ${escapeHtml(s.dept)}</p>
    <p><strong>Attendance:</strong> ${s.attended} / ${s.total} (${p}%)</p>
    <p><strong>Status:</strong> ${p<75? "At Risk":"OK"}</p>
    <div style="margin-top:10px">
      <button id="removeBtn" style="background:#ff4d4d;color:white;padding:8px;border-radius:8px">Remove Record</button>
    </div>
  `;
  document.getElementById("removeBtn").addEventListener("click", ()=>{
    if(confirm("Remove this record?")){
      students = students.filter(x=>!(x.id===s.id && x.name===s.name));
      saveToStorage();
      renderAll();
      modal.style.display="none";
    }
  });
  modal.style.display = "flex";
}

// Charts
function renderCharts(){
  // department average chart
  const deptMap = {};
  students.forEach(s=>{
    if(!s.dept) return;
    if(!deptMap[s.dept]) deptMap[s.dept]=[];
    deptMap[s.dept].push((s.attended/s.total)*100);
  });
  const labels = Object.keys(deptMap);
  const deptAvg = labels.map(l=> (deptMap[l].reduce((a,b)=>a+b,0)/deptMap[l].length).toFixed(1) );

  const ctx1 = document.getElementById("departmentChart").getContext("2d");
  if(deptChart) deptChart.destroy();
  deptChart = new Chart(ctx1, {
    type: "bar",
    data: { labels, datasets: [{ label:"Avg Attendance %", data: deptAvg, backgroundColor: labels.map(l=> colorForAvg(Number(deptAvg[labels.indexOf(l)]))) }]},
    options: { responsive:true, scales:{ y:{ beginAtZero:true, max:100 }}}
  });

  // simple trend chart: average attendance per student index (just illustrative)
  const ctx2 = document.getElementById("trendChart").getContext("2d");
  if(trendChart) trendChart.destroy();
  const trendLabels = students.map(s=>s.name);
  const trendData = students.map(s=>((s.attended/s.total)*100).toFixed(1));
  trendChart = new Chart(ctx2, {
    type:"line",
    data:{ labels: trendLabels, datasets:[{ label:"Attendance %", data: trendData, borderColor:"#28a745", backgroundColor:"rgba(40,167,69,0.15)", fill:true, tension:0.3 }]},
    options:{ responsive:true, scales:{ y:{ beginAtZero:true, max:100 }}}
  });
}

// helper for bar color
function colorForAvg(avg){
  if(avg<75) return "#ff6b6b";
  if(avg<=85) return "#ffb020";
  return "#28a745";
}

// Robust export PDF using html2canvas + jspdf
exportPDFBtn.addEventListener("click", async ()=>{
  try{
    exportPDFBtn.textContent = "Preparing...";
    exportPDFBtn.disabled = true;
    const container = document.querySelector(".container");
    const scale = 2;
    const canvas = await html2canvas(container, { scale, useCORS:true, allowTaint:true, logging:false });
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p","pt","a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);
    heightLeft -= pdfHeight;
    while(heightLeft > 0){
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);
      heightLeft -= pdfHeight;
    }
    pdf.save("Attendance_Dashboard.pdf");
  }catch(err){
    console.error(err);
    alert("Failed to export PDF: see console");
  }finally{
    exportPDFBtn.textContent = "Export PDF";
    exportPDFBtn.disabled = false;
  }
});

// Utility: escape CSV value
function csvEscape(val){ return (String(val).includes(",")||String(val).includes('"')) ? `"${String(val).replace(/"/g,'""')}"` : val; }

// When page unload - save data
window.addEventListener("beforeunload", saveToStorage);

// small helper - initial render
function initialRender(){
  updateDeptFilterOptions();
  renderAll();
}
initialRender();
